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
  // Compteurs en mémoire : pour chaque id ("clé:IP") on retient le nombre
  // de requêtes et l'heure de remise à zéro de la fenêtre.
  const hits = new Map(); // id -> { count, resetAt }

  // Ménage périodique : on supprime les entrées dont la fenêtre est expirée
  // pour éviter que la Map ne grossisse indéfiniment.
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
  }, windowMs);
  if (timer.unref) timer.unref(); // n'empêche pas le process de se terminer

  // Le middleware Express renvoyé : exécuté à chaque requête concernée.
  return function (req, res, next) {
    // En mode test, on désactive le limiteur pour ne pas fausser les tests.
    if (process.env.NODE_ENV === "test") return next();

    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const id = `${key}:${ip}`;
    const now = Date.now();

    // Première requête de cette IP, ou fenêtre expirée : on (ré)initialise le compteur.
    let entry = hits.get(id);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(id, entry);
    }
    entry.count++;

    // Quota dépassé : on refuse la requête avec le code HTTP 429 (Too Many Requests).
    if (entry.count > max) {
      // Retry-After indique au client dans combien de secondes réessayer.
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));

      // Réponse JSON pour les appels AJAX/fetch...
      if (req.xhr || (req.headers.accept || "").includes("json")) {
        return res.status(429).json({ error: message });
      }
      // ...sinon on renvoie l'utilisateur sur la page précédente avec le message d'erreur.
      const back = req.get("referer") || req.originalUrl || "/login";
      const sep = back.includes("?") ? "&" : "?";
      return res.status(429).redirect(back + sep + "error=" + encodeURIComponent(message));
    }

    next(); // quota OK : on laisse passer la requête
  };
}
