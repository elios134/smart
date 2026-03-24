import prisma from '../../prisma/prismaClient.js';

// GET /home
export async function getHome(req, res) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [sources, sessionsEnCours, ventesAujourdhui, employes] = await Promise.all([
            prisma.sourceEnergie.findMany({
                include: { stock: true, seuil: true },
                orderBy: { nom: 'asc' }
            }),
            prisma.sessionEnergie.count({ where: { statut: 'EN_COURS' } }),
            prisma.venteEnergie.findMany({ where: { createdAt: { gte: today } } }),
            prisma.user.findMany({
                where:   { role: { in: ['ADMIN', 'OPERATEUR'] } },
                orderBy: { lastName: 'asc' }
            })
        ]);

        const mwhStockes    = sources.reduce((acc, s) => acc + (s.stock?.quantite ?? 0), 0);
        const caAujourdhui  = ventesAujourdhui.reduce((acc, v) => acc + v.total, 0);

        const sessionsDuJour = await prisma.sessionEnergie.findMany({
            where: { statut: 'TERMINEE', finReel: { gte: today } }
        });
        const mwhProduits = sessionsDuJour.reduce((acc, s) => acc + (s.quantiteProduite ?? 0), 0);

        const alertes = sources.filter(s => s.seuil?.statut === 'ACTIF');

        res.render('pages/home.twig', {
            title:    'Tableau de bord',
            user:     req.session.user,
            navActive:'home',
            userRole: req.userRole,
            kpis: {
                mwhProduits:    Math.round(mwhProduits * 100) / 100,
                mwhStockes:     Math.round(mwhStockes * 100) / 100,
                caAujourdhui:   Math.round(caAujourdhui * 100) / 100,
                sessionsEnCours
            },
            sources, alertes, employes
        });
    } catch (error) {
        console.error(error);
        res.render('pages/home.twig', {
            title: 'Tableau de bord', user: req.session.user,
            navActive: 'home', userRole: req.userRole,
            kpis: { mwhProduits: 0, mwhStockes: 0, caAujourdhui: 0, sessionsEnCours: 0 },
            sources: [], alertes: [], employes: []
        });
    }
}
