// ── rateLimiter.js ────────────────────────────────────────────
// Limiteur de débit en mémoire (anti brute-force / anti-spam).
// Fenêtre fixe par couple (clé + adresse IP). Sans dépendance externe.
// NB : en mémoire = par-process. Pour un déploiement multi-instances,
// brancher un store partagé (Redis). Suffisant pour ce périmètre.
// ──────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {number} opts.windowMs  Durée de la fenêtre (ms)
 * @param {number} opts.max       Nombre max de requêtes par fenêtre
 * @param {string} opts.message   Message affiché en cas de dépassement
 * @param {string} opts.key       Identifiant logique du limiteur (sépare les compteurs)
 */
export function rateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 10,
  message = "Trop de tentatives. Veuillez réessayer plus tard.",
  key = "global",
} = {}) {
  const hits = new Map(); // id -> { count, resetAt }

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
  }, windowMs);
  if (timer.unref) timer.unref();

  return function (req, res, next) {
    if (process.env.NODE_ENV === "test") return next();

    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const id = `${key}:${ip}`;
    const now = Date.now();

    let entry = hits.get(id);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(id, entry);
    }
    entry.count++;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));

      if (req.xhr || (req.headers.accept || "").includes("json")) {
        return res.status(429).json({ error: message });
      }
      const back = req.get("referer") || req.originalUrl || "/login";
      const sep = back.includes("?") ? "&" : "?";
      return res.status(429).redirect(back + sep + "error=" + encodeURIComponent(message));
    }

    next();
  };
}
