import prisma from '../../prisma/prismaClient.js';

// GET /ventes
export async function getVentes(req, res) {
    try {
        const [ventes, sources, clients] = await Promise.all([
            prisma.venteEnergie.findMany({
                include: { source: true, tiers: true },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.sourceEnergie.findMany({ where: { actif: true }, include: { stock: true }, orderBy: { nom: 'asc' } }),
            prisma.tiers.findMany({ where: { typeTiers: 'CLIENT' }, orderBy: { nom: 'asc' } })
        ]);

        const kpis = {
            chiffreAffaires: Math.round(ventes.reduce((acc, v) => acc + v.total, 0) * 100) / 100,
            nbVentes:        ventes.length,
            panierMoyen:     ventes.length > 0 ? Math.round((ventes.reduce((acc, v) => acc + v.total, 0) / ventes.length) * 100) / 100 : 0
        };

        res.render('pages/ventes.twig', {
            title:    'Ventes d\'énergie',
            user:     req.session.user,
            navActive:'ventes',
            userRole: req.userRole,
            ventes, sources, clients, kpis
        });
    } catch (error) {
        console.error(error);
        res.redirect('/home?error=Erreur lors du chargement des ventes');
    }
}

// GET /ventes/:id
export async function getVenteDetail(req, res) {
    try {
        const vente = await prisma.venteEnergie.findUnique({
            where:   { id: parseInt(req.params.id) },
            include: { source: true, tiers: true }
        });
        if (!vente) return res.redirect('/ventes?error=Vente introuvable');

        res.render('pages/vente-detail.twig', {
            title:    `Vente #${vente.id}`,
            user:     req.session.user,
            navActive:'ventes',
            userRole: req.userRole,
            vente
        });
    } catch (error) {
        console.error(error);
        res.redirect('/ventes?error=Erreur lors du chargement');
    }
}

// POST /ventes/add
export async function postAddVente(req, res) {
    const { sourceId, tiersId, quantite, prixVente } = req.body;
    try {
        const qty   = parseFloat(quantite) || 0;
        const prix  = parseFloat(prixVente) || 0;
        const total = Math.round(qty * prix * 100) / 100;

        const stock = await prisma.stockEnergie.findUnique({ where: { sourceId: parseInt(sourceId) } });
        if (!stock || stock.quantite < qty) {
            return res.redirect('/ventes?error=Stock insuffisant pour cette vente');
        }

        await prisma.venteEnergie.create({
            data: { sourceId: parseInt(sourceId), tiersId: tiersId ? parseInt(tiersId) : null, quantite: qty, prixVente: prix, total }
        });
        await prisma.stockEnergie.update({
            where: { sourceId: parseInt(sourceId) },
            data:  { quantite: { decrement: qty } }
        });
        res.redirect('/ventes?success=Vente enregistrée — stock mis à jour');
    } catch (error) {
        console.error(error);
        res.redirect('/ventes?error=Erreur lors de l\'enregistrement');
    }
}

// POST /ventes/:id/delete
export async function postDeleteVente(req, res) {
    try {
        await prisma.venteEnergie.delete({ where: { id: parseInt(req.params.id) } });
        res.redirect('/ventes?success=Vente supprimée');
    } catch (error) {
        console.error(error);
        res.redirect('/ventes?error=Erreur lors de la suppression');
    }
}
