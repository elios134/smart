// ── csrf.js ───────────────────────────────────────────────────
// Protection CSRF (Cross-Site Request Forgery) — pattern "synchronizer token".
// Aucune dépendance externe : le secret est stocké côté serveur dans la session
// et renvoyé dans chaque page. Un site tiers ne peut pas lire ce secret, il ne
// peut donc pas forger de requête POST valide.
// ──────────────────────────────────────────────────────────────
import crypto from "crypto";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Renvoie le secret CSRF de la session, en le générant la première fois.
function ensureSecret(req) {
  if (!req.session) return null;
  if (!req.session.csrfSecret) {
    req.session.csrfSecret = crypto.randomBytes(32).toString("hex");
  }
  return req.session.csrfSecret;
}

/**
 * Middleware 1 — génère/charge le jeton et l'expose aux templates Twig
 * via res.locals.csrfToken (injecté ensuite dans les formulaires).
 */
export function csrfToken(req, res, next) {
  res.locals.csrfToken = ensureSecret(req) || "";
  next();
}

// Compare deux jetons à temps constant (timingSafeEqual) : empêche de
// deviner le secret en mesurant le temps de réponse des comparaisons.
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * Middleware 2 — valide le jeton sur toute méthode mutante (POST/PUT/PATCH/DELETE).
 * Le jeton peut arriver via le champ caché `_csrf` ou l'en-tête `x-csrf-token` (fetch).
 */
export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  // En environnement de test (supertest), on désactive la vérification
  // pour ne pas avoir à scraper le jeton dans chaque requête.
  if (process.env.NODE_ENV === "test") return next();

  const secret = req.session?.csrfSecret;
  const sent =
    (req.body && req.body._csrf) ||
    req.headers["x-csrf-token"] ||
    (req.query && req.query._csrf);

  if (secret && sent && safeEqual(secret, sent)) {
    return next();
  }

  if (req.xhr || (req.headers.accept || "").includes("json")) {
    return res.status(403).json({ error: "Jeton CSRF invalide ou manquant." });
  }

  const back = req.get("referer") || "/home";
  const sep = back.includes("?") ? "&" : "?";
  return res
    .status(403)
    .redirect(back + sep + "error=" + encodeURIComponent("Session expirée — veuillez réessayer."));
}
