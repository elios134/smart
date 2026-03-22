import prisma from "../../prisma/prismaClient.js";

export async function authguard(req, res, next) {
  try {
    if (req.session.user) {
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
        },
        where: {
          id: req.session.user,
        },
      });

      if (user) {
        if (user.role !== "SUPER_ADMIN") {
          throw new Error("Accès refusé : rôle SUPER_ADMIN requis");
        }
        req.user = user;
        return next();
      } else {
        throw new Error("L'utilisateur a été supprimé de la base de données");
      }
    }
    throw new Error("Aucun utilisateur enregistré en session");
  } catch (error) {
    console.log(error);
    res.redirect("/login");
  }
}