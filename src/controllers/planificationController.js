import prisma from '../../prisma/prismaClient.js';
import { getMixEnergetique } from '../services/energieService.js';

// GET /planification
export async function getPlanification(req, res) {
    try {
        const [sessions, sources, mix, fournisseurs] = await Promise.all([
            prisma.sessionEnergie.findMany({
                include: { source: true },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.sourceEnergie.findMany({ where: { actif: true }, orderBy: { nom: 'asc' } }),
            getMixEnergetique(),
            prisma.tiers.findMany({ where: { typeTiers: 'FOURNISSEUR' }, orderBy: { nom: 'asc' } })
        ]);

        const alertesAchat = sources.filter(s => mix && (mix[s.type] ?? 0) >= (s.seuil?.seuilDeclenchement ?? 100));
        const alertesVente = sources.filter(s => mix && (mix[s.type] ?? 0) < (s.seuil?.seuilArret ?? 0));

        const eventsCalendar = sessions.map(s => ({
            id:    s.id,
            title: `${s.source?.nom ?? 'Session'} — ${s.quantitePrevue} MWh`,
            start: s.debutPrev,
            end:   s.finPrev,
            color: s.statut === 'EN_COURS'  ? '#4F8AFF'
                 : s.statut === 'TERMINEE'  ? '#2FEEA8'
                 : s.statut === 'ANNULEE'   ? '#FF4F6B'
                 : '#5A6380'
        }));

        res.render('pages/planification.twig', {
            title:          'Planification',
            user:           req.session.user,
            navActive:      'planification',
            userRole:       req.userRole,
            sessions, sources, fournisseurs, mix, alertesAchat, alertesVente,
            eventsCalendar: JSON.stringify(eventsCalendar)
        });
    } catch (error) {
        console.error(error);
        res.redirect('/home?error=Erreur lors du chargement de la planification');
    }
}

// POST /planification/add
export async function postAddSession(req, res) {
    const { sourceId, titre, quantitePrevue, debutPrev, finPrev, notes } = req.body;
    try {
        await prisma.sessionEnergie.create({
            data: {
                sourceId:       parseInt(sourceId),
                titre:          titre || 'Session énergie',
                quantitePrevue: parseFloat(quantitePrevue) || 0,
                debutPrev:      new Date(debutPrev),
                finPrev:        new Date(finPrev),
                notes:          notes || null,
                statut:         'EN_ATTENTE'
            }
        });
        res.redirect('/planification?success=Session planifiée');
    } catch (error) {
        console.error(error);
        res.redirect('/planification?error=Erreur lors de la planification');
    }
}

// POST /planification/:id/lancer
export async function postLancerSession(req, res) {
    try {
        await prisma.sessionEnergie.update({
            where: { id: parseInt(req.params.id) },
            data:  { statut: 'EN_COURS', debutReel: new Date() }
        });
        res.redirect('/planification?success=Session lancée');
    } catch (error) {
        console.error(error);
        res.redirect('/planification?error=Erreur lors du lancement');
    }
}

// POST /planification/:id/terminer
export async function postTerminerSession(req, res) {
    const { quantiteProduite, coutTotal } = req.body;
    try {
        const session = await prisma.sessionEnergie.findUnique({ where: { id: parseInt(req.params.id) } });
        if (!session) return res.redirect('/planification?error=Session introuvable');
        const qte = parseFloat(quantiteProduite) || 0;
        await prisma.sessionEnergie.update({
            where: { id: session.id },
            data:  { statut: 'TERMINEE', finReel: new Date(), quantiteProduite: qte, coutTotal: parseFloat(coutTotal) || 0 }
        });
        await prisma.stockEnergie.upsert({
            where:  { sourceId: session.sourceId },
            update: { quantite: { increment: qte } },
            create: { sourceId: session.sourceId, quantite: qte }
        });
        res.redirect('/planification?success=Session terminée — stock mis à jour');
    } catch (error) {
        console.error(error);
        res.redirect('/planification?error=Erreur lors de la clôture');
    }
}

// POST /planification/:id/delete
export async function postDeleteSession(req, res) {
    try {
        await prisma.sessionEnergie.delete({ where: { id: parseInt(req.params.id) } });
        res.redirect('/planification?success=Session supprimée');
    } catch (error) {
        console.error(error);
        res.redirect('/planification?error=Erreur lors de la suppression');
    }
}
