// ── flashMiddleware.js ────────────────────────────────────────
// Lit ?success=... et ?error=... depuis l'URL
// et les injecte dans res.locals.flash pour tous les templates Twig
// ─────────────────────────────────────────────────────────────

export function flashMiddleware(req, res, next) {
    // Les messages voyagent dans l'URL avec des "_" à la place des espaces
    // (ex: ?success=Fournisseur_ajoute) ; on les reconvertit en espaces ici.
    const success = req.query.success
        ? String(req.query.success).replace(/_/g, ' ')
        : null;

    const error = req.query.error
        ? String(req.query.error).replace(/_/g, ' ')
        : null;

    // res.locals est automatiquement accessible dans tous les templates Twig.
    res.locals.flash = { success, error };
    next();
}
