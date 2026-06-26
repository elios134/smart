// ── authMiddleware.js ─────────────────────────────────────────
// Middlewares d'authentification et d'autorisation.
// authMiddleware  : vérifie qu'un utilisateur est connecté (via la session) et
//                   charge ses infos pour les rendre disponibles dans req/res.locals.
// requireRole     : restreint une route à certains rôles.
// Un cache mémoire évite d'interroger la base à chaque requête.
// ──────────────────────────────────────────────────────────────

import prisma from "../../prisma/prismaClient.js";

// --- CACHE EN MÉMOIRE ---
// Évite de faire une requête Prisma à chaque navigation de l'utilisateur
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (en millisecondes)

/**
 * Supprime un utilisateur du cache mémoire.
 * À appeler après modification de son profil/rôle pour forcer un rechargement depuis la base.
 * @param {number|string} userId — identifiant de l'utilisateur à invalider
 */
export function invalidateUserCache(userId) {
  userCache.delete(parseInt(userId, 10));
}

/**
 * Middleware Express qui protège les routes nécessitant d'être connecté.
 * Récupère l'utilisateur depuis la session (SUPER_ADMIN ou employé), charge ses
 * données (cache puis base), puis les injecte dans req.user / res.locals.
 * Redirige vers /login si aucun utilisateur valide n'est trouvé.
 */
export async function authMiddleware(req, res, next) {
  try {
    let userId = null;
    let sessionType = null; // 'user' ou 'employe'

    // 1. Priorité à la session SUPER_ADMIN
    if (req.session.user) {
      userId = req.session.user.id || req.session.user;
      sessionType = "user";
    }
    // 2. Sinon, session employé (ADMIN / OPERATEUR)
    else if (req.session.employe) {
      userId = req.session.employe.id || req.session.employe;
      sessionType = "employe";
    }

    if (!userId) {
      return res.redirect("/login");
    }

    const parsedId = parseInt(userId, 10);
    const now = Date.now();
    let user = null;

    // 1. On cherche l'utilisateur dans le cache en mémoire
    if (userCache.has(parsedId)) {
      const cached = userCache.get(parsedId);
      if (now - cached.timestamp < CACHE_TTL) {
        user = cached.data; // Cache valide !
      } else {
        userCache.delete(parsedId); // Cache expiré
      }
    }

    // 2. Si non trouvé ou expiré, on fait la requête Prisma
    if (!user) {
      user = await prisma.user.findUnique({
        select: {
          id: true, mail: true, role: true, firstName: true,
          lastName: true, socialReason: true, siret: true,
          directorName: true, employeurId: true,
        },
        where: { id: parsedId },
      });
      // On sauvegarde dans le cache pour les futures requêtes
      if (user) {
        userCache.set(parsedId, { data: user, timestamp: now });
      }
    }

    if (!user) {
      // Nettoyer la session invalide proprement en la supprimant de l'objet
      delete req.session[sessionType];
      const redirect = sessionType === "employe" ? "/employes/login" : "/login";
      return res.redirect(redirect);
    }

    // Injecter dans la requête
    req.user = user;
    req.userRole = user.role; // "SUPER_ADMIN" | "ADMIN" | "OPERATEUR"

    // Injecter dans res.locals pour accès direct dans les templates Twig
    res.locals.userRole = user.role;
    res.locals.currentUser = user;

    return next();
  } catch (error) {
    console.error("[authMiddleware] Erreur :", error);
    res.redirect("/login");
  }
}

/**
 * Factory : restreint l'accès aux rôles spécifiés.
 * Retourne un middleware qui laisse passer si req.userRole fait partie des rôles
 * autorisés, sinon renvoie une erreur 403 (requête AJAX) ou une redirection (page).
 * Usage : requireRole("SUPER_ADMIN", "ADMIN")
 *
 * Hiérarchie : SUPER_ADMIN > ADMIN > OPERATEUR
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.redirect("/login");
    }

    if (roles.includes(req.userRole)) {
      return next();
    }

    // Si la requête est de type AJAX / Fetch (ex: soumission de formulaire en arrière-plan)
    // On renvoie un code HTTP 403 propre plutôt qu'une page HTML de redirection
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(403).json({ error: "Accès refusé. Rôle insuffisant." });
    }

    // Rôle insuffisant → rediriger avec message d'erreur
    const redirectUrl = "/home?error=Accès non autorisé";

    return res.redirect(redirectUrl);
  };
}
