import prisma from "../../prisma/prismaClient.js";

export async function authguardEmploye(req, res, next) {
  try {
    if (req.session.employe) {
      const user = await prisma.user.findUnique({
        select: {
          id: true,
          mail: true,
          role: true,
          firstName: true,
          lastName: true,
          employeurId: true,
        },
        where: {
          id: req.session.employe,
        },
      });

      if (user) {
        if (user.role !== "ADMIN" && user.role !== "OPERATEUR") {
          throw new Error("Accès refusé : rôle ADMIN ou OPERATEUR requis");
        }
        req.user = user;
        return next();
      } else {
        throw new Error("L'employé a été supprimé de la base de données");
      }
    }
    throw new Error("Aucun employé en session");
  } catch (error) {
    console.log(error);
    req.session.employe = null;
    res.redirect("/employes/login");
  }
}