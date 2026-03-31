import prisma from '../../prisma/prismaClient.js';
import { getMixEnergetique, getNotifications, clearNotifications } from '../services/energieService.js';

// GET /energie
export async function getEnergie(req, res) {
    try {
        const [sources, seuils, mix] = await Promise.all([
            prisma.sourceEnergie.findMany({ include: { stock: true, seuil: true }, orderBy: { createdAt: 'asc' } }),
            prisma.seuilEnergie.findMany({ include: { source: true }, orderBy: { createdAt: 'desc' } }),
            getMixEnergetique()
        ]);
        const alertes = sources.filter(s => s.seuil && mix && (mix[s.type] ?? 0) < s.seuil.seuilArret).map(s => ({ source: s, mixPct: mix?.[s.type] ?? 0 }));
        res.render('pages/energie.twig', { title: 'Énergie', user: req.session.user, navActive: 'energie', userRole: req.userRole, sources, seuils, mix: mix ? JSON.stringify(mix) : 'null', mixObj: mix, alertes });
    } catch (error) {
        console.error(error);
        res.redirect('/home?error=Erreur chargement énergie');
    }
}

// POST /energie/sources/add
export async function postAddSource(req, res) {
    const { nom, type, coutProduction, couleur } = req.body;
    try {
        await prisma.sourceEnergie.create({ data: { nom, type, coutProduction: parseFloat(coutProduction) || 0, couleur: couleur || '#4F8AFF' } });
        res.redirect('/energie?success=Source ajoutée');
    } catch (e) { console.error(e); res.redirect('/energie?error=Erreur ajout source'); }
}

// POST /energie/sources/:id/edit
export async function postEditSource(req, res) {
    const { nom, type, coutProduction, couleur, actif } = req.body;
    try {
        await prisma.sourceEnergie.update({ where: { id: parseInt(req.params.id) }, data: { nom, type, coutProduction: parseFloat(coutProduction) || 0, couleur: couleur || '#4F8AFF', actif: actif === 'on' } });
        res.redirect('/energie?success=Source modifiée');
    } catch (e) { console.error(e); res.redirect('/energie?error=Erreur modification source'); }
}

// POST /energie/sources/:id/delete
export async function postDeleteSource(req, res) {
    try {
        const id = parseInt(req.params.id);
        await prisma.venteEnergie.deleteMany({ where: { sourceId: id } });
        await prisma.achatEnergie.deleteMany({ where: { sourceId: id } });
        await prisma.sessionEnergie.deleteMany({ where: { sourceId: id } });
        await prisma.stockEnergie.deleteMany({ where: { sourceId: id } });
        await prisma.seuilEnergie.deleteMany({ where: { sourceId: id } });
        await prisma.sourceEnergie.delete({ where: { id } });
        res.redirect('/energie?success=Source supprimée');
    } catch (e) { console.error(e); res.redirect('/energie?error=Erreur suppression source'); }
}

// POST /energie/seuils/save
export async function postSaveSeuil(req, res) {
    const { sourceId, seuilDeclenchement, seuilArret, declenchementAuto, statut } = req.body;
    try {
        await prisma.seuilEnergie.upsert({
            where:  { sourceId: parseInt(sourceId) },
            update: { seuilDeclenchement: parseFloat(seuilDeclenchement) || 20, seuilArret: parseFloat(seuilArret) || 10, declenchementAuto: declenchementAuto === 'on', statut: statut || 'ACTIF' },
            create: { sourceId: parseInt(sourceId), seuilDeclenchement: parseFloat(seuilDeclenchement) || 20, seuilArret: parseFloat(seuilArret) || 10, declenchementAuto: declenchementAuto === 'on', statut: statut || 'ACTIF' }
        });
        res.redirect('/energie?success=Seuil configuré');
    } catch (e) { console.error(e); res.redirect('/energie?error=Erreur configuration seuil'); }
}

// POST /energie/seuils/:id/delete
export async function postDeleteSeuil(req, res) {
    try {
        await prisma.seuilEnergie.delete({ where: { id: parseInt(req.params.id) } });
        res.redirect('/energie?success=Seuil supprimé');
    } catch (e) { console.error(e); res.redirect('/energie?error=Erreur suppression seuil'); }
}

// GET /energie/prix-historique — prix moyens vente & achat sur 12 mois (DB locale)
export async function apiPrixHistorique(req, res) {
    try {
        const depuis = new Date();
        depuis.setMonth(depuis.getMonth() - 11);
        depuis.setDate(1);
        depuis.setHours(0, 0, 0, 0);

        const [ventes, achats] = await Promise.all([
            prisma.venteEnergie.findMany({ where: { createdAt: { gte: depuis } }, select: { prixVente: true, createdAt: true } }),
            prisma.achatEnergie.findMany({ where: { createdAt: { gte: depuis } }, select: { prixAchat: true, createdAt: true } })
        ]);

        // Construire les 12 mois glissants
        const mois = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            mois.push({ label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }), y: d.getFullYear(), m: d.getMonth() });
        }

        function moyennePrix(rows, key) {
            return mois.map(({ y, m }) => {
                const filtres = rows.filter(r => {
                    const d = new Date(r.createdAt);
                    return d.getFullYear() === y && d.getMonth() === m;
                });
                if (!filtres.length) return null;
                const sum = filtres.reduce((acc, r) => acc + (r[key] ?? 0), 0);
                return Math.round((sum / filtres.length) * 100) / 100;
            });
        }

        res.json({
            labels:  mois.map(m => m.label),
            ventes:  moyennePrix(ventes, 'prixVente'),
            achats:  moyennePrix(achats, 'prixAchat')
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erreur' });
    }
}

// GET /energie/notifications
export function apiGetNotifications(req, res) {
    res.json(getNotifications());
}

// POST /energie/notifications/clear
export function apiClearNotifications(req, res) {
    clearNotifications();
    res.json({ ok: true });
}
