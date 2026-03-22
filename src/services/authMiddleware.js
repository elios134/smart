import prisma from "../../prisma/prismaClient.js";

export async function authMiddleware(req, res, next) {
  try {
    let userId = null;
    let sessionType = null; // 'user' ou 'employe'

    // 1. Priorité à la session SUPER_ADMIN
    if (req.session.user) {
      userId = typeof req.session.user === "object" ? req.session.user.id : req.session.user;
      sessionType = "user";
    }
    // 2. Sinon, session employé (ADMIN / OPERATEUR)
    else if (req.session.employe) {
      userId = typeof req.session.employe === "object" ? req.session.employe.id : req.session.employe;
      sessionType = "employe";
    }

    if (!userId) {
      return res.redirect("/login");
    }

    const user = await prisma.user.findUnique({
      select: {
        id: true,
        mail: true,
        role: true,
        firstName: true,
        lastName: true,
        socialReason: true,
        siret: true,
        directorName: true,
        employeurId: true,
      },
      where: { id: userId },
    });

    if (!user) {
      // Nettoyer la session invalide
      req.session[sessionType] = null;
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

    // Rôle insuffisant → rediriger avec message d'erreur
    const redirectUrl = req.userRole === "OPERATEUR"
      ? "/production?error=Accès non autorisé"
      : "/home?error=Accès non autorisé";

    return res.redirect(redirectUrl);
  };
}
