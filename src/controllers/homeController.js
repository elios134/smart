import prisma from "../../prisma/prismaClient.js";

// GET /home
export async function getHome(req, res) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [produitsCount, productionsEnCours, ventesAujourdhui, produits, employes] = await Promise.all([
            prisma.produit.count(),
            prisma.production.count({ where: { statut: "EN_COURS" } }),
            prisma.vente.count({ where: { createdAt: { gte: today } } }),
            prisma.produit.findMany({
                include: { stock: true },
                orderBy: { nom: "asc" }
            }),
            prisma.user.findMany({
                where: { role: { in: ["ADMIN", "OPERATEUR"] } },
                orderBy: { lastName: "asc" }
            })
        ]);

        res.render("pages/home.twig", {
            title: "Tableau de bord",
            user: req.session.user,
            navActive: "home",
            userRole: req.userRole,
            kpis: { produitsCount, productionsEnCours, ventesAujourdhui },
            produits,
            employes
        });
    } catch (error) {
        console.error(error);
        res.render("pages/home.twig", {
            title: "Tableau de bord",
            user: req.session.user,
            navActive: "home",
            userRole: req.userRole,
            kpis: { produitsCount: 0, productionsEnCours: 0, ventesAujourdhui: 0 },
            produits: [],
            employes: []
        });
    }
}