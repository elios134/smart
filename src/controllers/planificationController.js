/**
 * Contrôleur de la planification des sessions de production d'énergie.
 * Rôle : afficher le calendrier des sessions, en créer de nouvelles, les lancer,
 * les terminer (avec mise à jour automatique du stock) et les supprimer.
 * Une « session » représente une production planifiée d'énergie pour une source.
 */
import prisma from '../../prisma/prismaClient.js';
import { getMixEnergetique } from '../services/energieService.js'; // calcule la répartition (%) des sources d'énergie
import { toInt, toPositiveFloat } from '../services/validators.js'; // conversion sûre des champs de formulaire

// GET /planification
// Charge tout ce qu'il faut pour la page : sessions, sources actives, mix
// énergétique et fournisseurs, calcule les alertes, puis rend la vue calendrier.
export async function getPlanification(req, res) {
    try {
        // Promise.all lance les 4 requêtes en parallèle pour gagner du temps.
        const [sessions, sources, mix, fournisseurs] = await Promise.all([
            prisma.sessionEnergie.findMany({
                include: { source: true },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.sourceEnergie.findMany({ where: { actif: true }, orderBy: { nom: 'asc' } }),
            getMixEnergetique(),
            prisma.tiers.findMany({ where: { typeTiers: 'FOURNISSEUR' }, orderBy: { nom: 'asc' } })
        ]);

        // Alertes d'achat : sources dont la part dans le mix dépasse le seuil de déclenchement.
        const alertesAchat = sources.filter(s => mix && (mix[s.type] ?? 0) >= (s.seuil?.seuilDeclenchement ?? 100));
        // Alertes de vente : sources dont la part passe sous le seuil d'arrêt (surplus à vendre).
        const alertesVente = sources.filter(s => mix && (mix[s.type] ?? 0) < (s.seuil?.seuilArret ?? 0));

        // Transforme chaque session en évènement pour le calendrier (titre, dates,
        // couleur selon le statut) lu côté navigateur.
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
// Crée une nouvelle session planifiée à partir du formulaire.
// Valide la source et les dates (fin > début) avant l'enregistrement,
// avec le statut initial EN_ATTENTE.
export async function postAddSession(req, res) {
    const { sourceId, titre, quantitePrevue, debutPrev, finPrev, notes } = req.body;
    try {
        const parsedSourceId = toInt(sourceId);
        if (parsedSourceId === null) return res.redirect('/planification?error=Source invalide');

        // Conversion des champs date du formulaire en objets Date.
        const dDebut = new Date(debutPrev);
        const dFin = new Date(finPrev);

        // On refuse les dates illisibles, puis une fin antérieure ou égale au début.
        if (isNaN(dDebut.getTime()) || isNaN(dFin.getTime())) {
            return res.redirect('/planification?error=Les dates de planification sont invalides');
        }
        if (dFin <= dDebut) {
            return res.redirect('/planification?error=La date de fin doit être postérieure au début');
        }

        const qte = toPositiveFloat(quantitePrevue);

        await prisma.sessionEnergie.create({
            data: {
                sourceId:       parsedSourceId,
                titre:          titre || 'Session énergie',
                quantitePrevue: qte === null ? 0 : qte,
                debutPrev:      dDebut,
                finPrev:        dFin,
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
// Démarre une session : passe son statut de EN_ATTENTE à EN_COURS et
// enregistre l'heure de début réelle. Seule une session en attente est lançable.
export async function postLancerSession(req, res) {
    try {
        const id = toInt(req.params.id);
        if (id === null) return res.redirect('/planification?error=Identifiant de session invalide');

        const session = await prisma.sessionEnergie.findUnique({ where: { id } });
        if (!session) return res.redirect('/planification?error=Session introuvable');
        if (session.statut !== 'EN_ATTENTE') {
            return res.redirect('/planification?error=Seule une session en attente peut être lancée');
        }

        // debutReel = maintenant : on garde l'heure effective du démarrage.
        await prisma.sessionEnergie.update({
            where: { id },
            data:  { statut: 'EN_COURS', debutReel: new Date() }
        });
        res.redirect('/planification?success=Session lancée');
    } catch (error) {
        console.error(error);
        res.redirect('/planification?error=Erreur lors du lancement');
    }
}

// POST /planification/:id/terminer
// Clôture une session : enregistre la quantité réellement produite et le coût,
// puis ajoute cette quantité au stock de la source. On refuse une session déjà clôturée.
export async function postTerminerSession(req, res) {
    const { quantiteProduite, coutTotal } = req.body;
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.redirect('/planification?error=Identifiant de session invalide');

        const session = await prisma.sessionEnergie.findUnique({ where: { id } });
        if (!session) return res.redirect('/planification?error=Session introuvable');
        if (session.statut === 'TERMINEE' || session.statut === 'ANNULEE') {
            return res.redirect('/planification?error=Cette session est déjà clôturée');
        }

        const qteRaw = toPositiveFloat(quantiteProduite);
        const qte = qteRaw === null ? 0 : qteRaw;

        // Transaction : les deux écritures réussissent ensemble ou échouent ensemble,
        // pour garder la session et le stock cohérents.
        await prisma.$transaction([
            prisma.sessionEnergie.update({
                where: { id: session.id },
                data:  { statut: 'TERMINEE', finReel: new Date(), quantiteProduite: qte, coutTotal: parseFloat(coutTotal) || 0 }
            }),
            // upsert : si un stock existe déjà pour cette source on l'incrémente,
            // sinon on le crée avec la quantité produite.
            prisma.stockEnergie.upsert({
                where:  { sourceId: session.sourceId },
                update: { quantite: { increment: qte } },
                create: { sourceId: session.sourceId, quantite: qte }
            })
        ]);

        res.redirect('/planification?success=Session terminée — stock mis à jour');
    } catch (error) {
        console.error(error);
        res.redirect('/planification?error=Erreur lors de la clôture');
    }
}

// POST /planification/:id/delete
// Supprime une session planifiée identifiée par son id.
export async function postDeleteSession(req, res) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.redirect('/planification?error=Identifiant de session invalide');

        await prisma.sessionEnergie.delete({ where: { id } });
        res.redirect('/planification?success=Session supprimée');
    } catch (error) {
        console.error(error);
        res.redirect('/planification?error=Erreur lors de la suppression');
    }
}
