import prisma from '../../prisma/prismaClient.js';

// GET /stock
export async function getStock(req, res) {
    try {
        const [sources, achats] = await Promise.all([
            prisma.sourceEnergie.findMany({
                include: { stock: true },
                orderBy: { nom: 'asc' }
            }),
            prisma.achatEnergie.findMany({
                include: { source: true, tiers: true },
                orderBy: { createdAt: 'desc' },
                take: 50
            })
        ]);

        const fournisseurs = await prisma.tiers.findMany({
            where: { typeTiers: 'FOURNISSEUR' }, orderBy: { nom: 'asc' }
        });

        const stockTotal = sources.reduce((acc, s) => acc + (s.stock?.quantite ?? 0), 0);

        res.render('pages/stock.twig', {
            title:      'Stock d\'énergie',
            user:       req.session.user,
            navActive:  'stock',
            userRole:   req.userRole,
            sources, achats, fournisseurs,
            stockTotal: Math.round(stockTotal * 100) / 100
        });
    } catch (error) {
        console.error(error);
        res.redirect('/home?error=Erreur lors du chargement du stock');
    }
}

// POST /stock/achats/add
export async function postAddAchat(req, res) {
    const { sourceId, tiersId, quantite, prixAchat } = req.body;
    try {
        const qty   = parseFloat(quantite) || 0;
        const prix  = parseFloat(prixAchat) || 0;
        const total = Math.round(qty * prix * 100) / 100;

        await prisma.achatEnergie.create({
            data: {
                sourceId: parseInt(sourceId),
                tiersId:  tiersId ? parseInt(tiersId) : null,
                quantite: qty, prixAchat: prix, total
            }
        });
        await prisma.stockEnergie.upsert({
            where:  { sourceId: parseInt(sourceId) },
            update: { quantite: { increment: qty } },
            create: { sourceId: parseInt(sourceId), quantite: qty }
        });
        res.redirect('/stock?success=Achat enregistré — stock mis à jour');
    } catch (error) {
        console.error(error);
        res.redirect('/stock?error=Erreur lors de l\'achat');
    }
}

// POST /stock/achats/:id/delete
export async function postDeleteAchat(req, res) {
    try {
        const id = parseInt(req.params.id);
        const achat = await prisma.achatEnergie.findUnique({ where: { id } });
        if (!achat) return res.redirect('/stock?error=Achat introuvable');

        // Retirer la quantité du stock
        await prisma.stockEnergie.update({
            where:  { sourceId: achat.sourceId },
            data:   { quantite: { decrement: achat.quantite } }
        });
        await prisma.achatEnergie.delete({ where: { id } });
        res.redirect('/stock?success=Achat supprimé — stock mis à jour');
    } catch (error) {
        console.error(error);
        res.redirect('/stock?error=Erreur lors de la suppression');
    }
}

// POST /stock/ajuster/:sourceId
export async function postAjusterStock(req, res) {
    const { quantite, sens } = req.body;
    try {
        const sourceId = parseInt(req.params.sourceId);
        const qty = parseFloat(quantite) || 0;
        await prisma.stockEnergie.upsert({
            where:  { sourceId },
            update: { quantite: sens === 'retirer' ? { decrement: qty } : { increment: qty } },
            create: { sourceId, quantite: qty }
        });
        res.redirect('/stock?success=Stock ajusté');
    } catch (error) {
        console.error(error);
        res.redirect('/stock?error=Erreur lors de l\'ajustement');
    }
}
