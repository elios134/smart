// ── securityHeaders.js ────────────────────────────────────────
// En-têtes de sécurité HTTP (équivalent minimal de Helmet, sans dépendance).
// Pose une Content-Security-Policy adaptée aux ressources réellement chargées :
//   - scripts : self + cdn.jsdelivr.net (Chart.js, FullCalendar)
//   - styles  : self + Google Fonts
//   - polices : self + fonts.gstatic.com
// 'unsafe-inline' reste nécessaire (scripts/JSON inline + styles inline existants).
// ──────────────────────────────────────────────────────────────

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://cdn.jsdelivr.net",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

export function securityHeaders(req, res, next) {
  res.setHeader("Content-Security-Policy", CSP);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-XSS-Protection", "0"); // désactive le filtre legacy (obsolète, remplacé par la CSP)
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
}
