import prisma from "../../prisma/prismaClient.js";

// Utilitaire — données chart pour N derniers jours
function buildChartData(ventes, productions, days) {
    const labels = [];
    const caMap  = {};
    const coutMap = {};

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        labels.push(key);
        caMap[key]   = 0;
        coutMap[key] = 0;
    }

    ventes.forEach(v => {
        const key = new Date(v.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        if (caMap[key] !== undefined) caMap[key] += v.totalTTC ?? 0;
    });

    productions.forEach(p => {
        const key = new Date(p.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        if (coutMap[key] !== undefined) coutMap[key] += p.coutFab ?? 0;
    });

    return {
        labels,
        ca:    labels.map(l => Math.round(caMap[l])),
        couts: labels.map(l => Math.round(coutMap[l]))
    };
}

// GET /reporting
export async function getReporting(req, res) {
    try {
        const [ventes, productions, matieres, seuilsConfig] = await Promise.all([
            prisma.vente.findMany({ orderBy: { createdAt: 'desc' } }),
            prisma.production.findMany({ orderBy: { createdAt: 'desc' } }),
            prisma.matierePremiere.findMany({
                include: { stockMP: true, historiquePrix: { orderBy: { lastUpdated: 'desc' }, take: 1 } },
                orderBy: { nom: 'asc' }
            }),
            prisma.seuilConfig.findMany({
                include: { matiere: true },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        // Données chart pour les 3 périodes
        const chartData = {
            '7':  buildChartData(ventes, productions, 7),
            '30': buildChartData(ventes, productions, 30),
            '90': buildChartData(ventes, productions, 90)
        };

        // Besoins estimés 30 prochains jours
        const besoins = matieres.map(m => {
            const stock     = m.stockMP?.quantite ?? 0;
            const prixActuel = m.historiquePrix[0]?.prix ?? m.prixActuel ?? 0;
            const seuil      = seuilsConfig.find(s => s.matiereId === m.id);
            const seuilActif = seuil?.statut === 'ACTIF';
            // Besoin estimé = seuil d'achat comme référence de stock minimum
            const besoinActuel = Math.max(0, (seuil?.seuilAchat ?? 0) - stock);
            const pct = seuil?.seuilAchat > 0
                ? Math.min(100, Math.round((stock / seuil.seuilAchat) * 100))
                : 0;
            return { ...m, prixActuel, stock, seuilActif, besoinActuel, pct };
        });

        // Map matieres pour JS (stepper modal)
        const matieresMap = {};
        matieres.forEach(m => {
            matieresMap[m.id] = {
                nom: m.nom,
                prixActuel: m.historiquePrix[0]?.prix ?? m.prixActuel ?? 0
            };
        });

        res.render('pages/reporting.twig', {
            title: 'Mes Reporting',
            user: req.session.user,
            navActive: 'reporting',
            userRole: req.userRole,
            chartData: JSON.stringify(chartData),
            besoins,
            seuilsConfig,
            matieres,
            matieresMap: JSON.stringify(matieresMap)
        });
    } catch (error) {
        console.error(error);
        res.redirect('/home?error=Erreur lors du chargement du reporting');
    }
}

// POST /reporting/seuils/add
export async function postAddSeuil(req, res) {
    const { matiereId, seuilAchat, seuilVente, declenchementAuto, statut } = req.body;
    try {
        await prisma.seuilConfig.upsert({
            where: { matiereId: parseInt(matiereId) },
            update: {
                seuilAchat:        parseFloat(seuilAchat) || 0,
                seuilVente:        parseFloat(seuilVente) || 0,
                declenchementAuto: declenchementAuto === 'on',
                statut:            statut || 'ACTIF'
            },
            create: {
                matiereId:         parseInt(matiereId),
                seuilAchat:        parseFloat(seuilAchat) || 0,
                seuilVente:        parseFloat(seuilVente) || 0,
                declenchementAuto: declenchementAuto === 'on',
                statut:            statut || 'ACTIF'
            }
        });
        res.redirect('/reporting?success=Seuil configuré');
    } catch (error) {
        console.error(error);
        res.redirect('/reporting?error=Erreur lors de la configuration');
    }
}

// POST /reporting/seuils/:id/delete
export async function postDeleteSeuil(req, res) {
    try {
        await prisma.seuilConfig.delete({ where: { id: parseInt(req.params.id) } });
        res.redirect('/reporting?success=Seuil supprimé');
    } catch (error) {
        console.error(error);
        res.redirect('/reporting?error=Erreur lors de la suppression');
    }
}
