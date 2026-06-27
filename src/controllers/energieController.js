/**
 * Contrôleur du module Énergie.
 * ------------------------------------------------------------------
 * Un "contrôleur" est le code qui reçoit une requête HTTP (req), fait le travail
 * demandé (lire/écrire en base, calculer…) puis renvoie une réponse (res) :
 * soit une page HTML (res.render), soit une redirection (res.redirect), soit
 * des données JSON (res.json) pour le JavaScript du navigateur.
 *
 * Ce contrôleur gère :
 *   - les SOURCES d'énergie (ajout / modification / suppression) ;
 *   - les SEUILS d'alerte associés à chaque source ;
 *   - l'affichage du TABLEAU DE BORD énergie (mix + alertes) ;
 *   - des endpoints JSON : historique des prix (graphique) et notifications.
 *
 * Convention : les fonctions nommées "api..." répondent en JSON ; les autres
 * rendent une vue Twig ou redirigent avec un message de succès/erreur dans l'URL.
 */
import prisma from '../../prisma/prismaClient.js';
// Fonctions du service énergie (logique métier : mix temps réel, notifications).
import { getMixEnergetique, getNotifications, clearNotifications } from '../services/energieService.js';
// Petits outils de validation/conversion (nettoyer un nombre, vérifier une valeur autorisée…).
import { toPositiveFloat, toInt, isOneOf, TYPES_SOURCE, STATUTS_ACTIF } from '../services/validators.js';

// Prépare les champs communs d'une source à partir des données du formulaire (req.body).
// Factorisé ici car l'ajout ET la modification ont besoin exactement des mêmes champs.
// Retourne un objet prêt à être enregistré par Prisma.
function buildSourceData(body) {
    const cout = toPositiveFloat(body.coutProduction); // Convertit le coût en nombre positif (ou null si invalide).
    return {
        nom: (body.nom || '').trim(),                  // Nom nettoyé (espaces de début/fin retirés).
        type: body.type,                               // Type d'énergie (vérifié plus loin par isOneOf).
        coutProduction: cout === null ? 0 : cout,      // Coût invalide → on met 0 par défaut.
        capaciteMax: toPositiveFloat(body.capaciteMax),// Capacité max de stockage (MWh) — null si non renseignée.
        couleur: body.couleur || '#4F8AFF'             // Couleur d'affichage (bleu par défaut).
    };
}

// GET /energie
// Affiche le tableau de bord énergie : liste des sources (avec leur stock et leur seuil),
// liste des seuils, mix énergétique en temps réel, et calcule quelles sources sont
// "en alerte" (leur part dans le mix est passée sous leur seuil d'arrêt).
export async function getEnergie(req, res) {
    try {
        // Trois opérations lancées EN PARALLÈLE (Promise.all) pour gagner du temps :
        // les sources, les seuils, et le mix énergétique (appel API externe).
        const [sources, seuils, mix] = await Promise.all([
            prisma.sourceEnergie.findMany({ include: { stock: true, seuil: true }, orderBy: { createdAt: 'asc' } }),
            prisma.seuilEnergie.findMany({ include: { source: true }, orderBy: { createdAt: 'desc' } }),
            getMixEnergetique()
        ]);
        // On garde les sources qui ont un seuil, un mix disponible, et dont la part
        // actuelle (mix[s.type]) est inférieure au seuil d'arrêt → ce sont les alertes.
        const alertes = sources.filter(s => s.seuil && mix && (mix[s.type] ?? 0) < s.seuil.seuilArret).map(s => ({ source: s, mixPct: mix?.[s.type] ?? 0 }));
        // Alertes de production : part dans le mix AU-DESSUS du seuil de déclenchement → bon moment pour produire.
        const alertesProduction = sources.filter(s => s.seuil && mix && (mix[s.type] ?? 0) >= s.seuil.seuilDeclenchement).map(s => ({ source: s, mixPct: mix?.[s.type] ?? 0 }));
        // On envoie toutes ces données à la vue Twig qui construira la page HTML.
        // mix est passé deux fois : en texte JSON (pour le JS du navigateur) et en objet (pour Twig).
        // apiConfigured : la clé ENTSO-E est-elle renseignée ? Permet de distinguer
        // « non configurée » (clé absente) de « temporairement indisponible » (clé OK mais API muette).
        const apiConfigured = !!(process.env.ENTSOE_API_KEY && process.env.ENTSOE_API_KEY.trim());
        res.render('pages/energie.twig', { title: 'Énergie', user: req.session.user, navActive: 'energie', userRole: req.userRole, sources, seuils, mix: mix ? JSON.stringify(mix) : 'null', mixObj: mix, alertes, alertesProduction, apiConfigured });
    } catch (error) {
        // En cas d'erreur, on évite la page blanche : on renvoie à l'accueil avec un message.
        console.error(error);
        res.redirect('/home?error=Erreur chargement énergie');
    }
}

// POST /energie/sources/add
// Crée une nouvelle source d'énergie.
// Vérifie que le nom est rempli et que le type fait partie des types autorisés.
export async function postAddSource(req, res) {
    try {
        const data = buildSourceData(req.body); // Prépare les champs depuis le formulaire.
        // Validations : on bloque et on redirige avec un message si quelque chose ne va pas.
        if (!data.nom) return res.redirect('/energie?error=Le nom de la source est requis');
        if (!isOneOf(data.type, TYPES_SOURCE)) return res.redirect('/energie?error=Type de source invalide');

        await prisma.sourceEnergie.create({ data }); // Enregistrement en base.
        res.redirect('/energie?success=Source ajoutée');
    } catch (e) { console.error(e); res.redirect('/energie?error=Erreur ajout source'); }
}

// POST /energie/sources/import
// Crée automatiquement une source par type d'énergie détecté dans le mix ENTSO-E.
// On n'importe que les types gérés par l'app (TYPES_SOURCE) et seulement ceux qui
// n'existent pas encore en base, pour éviter les doublons. Le coût de production
// reste à renseigner ensuite (donnée interne, absente de l'API).
export async function postImportSources(req, res) {
    try {
        const mix = await getMixEnergetique();
        if (!mix) return res.redirect('/energie?error=Mix indisponible — réessayez plus tard');

        // Types déjà présents en base → on les exclut pour ne rien dupliquer.
        const existantes = await prisma.sourceEnergie.findMany({ select: { type: true } });
        const typesExistants = new Set(existantes.map(s => s.type));

        // Libellés lisibles utilisés comme nom de la source créée.
        const LABELS = { EOLIEN: 'Éolien', SOLAIRE: 'Solaire', HYDRAULIQUE: 'Hydraulique', HYDROGENE: 'Hydrogène', RESEAU: 'Réseau' };

        // Clés du mix gardées : type géré par l'app + absent en base (on ignore _totalMW, NUCLEAIRE, etc.).
        const aCreer = Object.keys(mix).filter(t => TYPES_SOURCE.includes(t) && !typesExistants.has(t));
        if (!aCreer.length) return res.redirect('/energie?success=Aucune nouvelle source à importer');

        await prisma.sourceEnergie.createMany({
            data: aCreer.map(t => ({ nom: LABELS[t] || t, type: t, coutProduction: 0, couleur: '#4F8AFF' }))
        });
        res.redirect(`/energie?success=${aCreer.length} source(s) importée(s) depuis le mix`);
    } catch (e) { console.error(e); res.redirect('/energie?error=Erreur lors de l\'import des sources'); }
}

// POST /energie/sources/:id/edit
// Modifie une source existante (identifiée par :id dans l'URL).
export async function postEditSource(req, res) {
    try {
        const id = toInt(req.params.id); // L'id vient de l'URL → on le convertit en entier.
        if (id === null) return res.redirect('/energie?error=Identifiant invalide');

        const data = buildSourceData(req.body);
        if (!data.nom) return res.redirect('/energie?error=Le nom de la source est requis');
        if (!isOneOf(data.type, TYPES_SOURCE)) return res.redirect('/energie?error=Type de source invalide');

        // Une case à cocher HTML envoie la valeur 'on' quand elle est cochée, rien sinon.
        // On la traduit donc en vrai/faux pour le champ booléen `actif`.
        await prisma.sourceEnergie.update({ where: { id }, data: { ...data, actif: req.body.actif === 'on' } });
        res.redirect('/energie?success=Source modifiée');
    } catch (e) { console.error(e); res.redirect('/energie?error=Erreur modification source'); }
}

// POST /energie/sources/:id/delete
// Supprime une source d'énergie.
// Comme d'autres tables "pointent" vers cette source (clés étrangères), on doit
// d'abord effacer toutes les lignes liées, sinon la base refuse la suppression.
export async function postDeleteSource(req, res) {
    try {
        const id = parseInt(req.params.id);
        // Ordre important : on supprime les enfants AVANT le parent (la source).
        await prisma.venteEnergie.deleteMany({ where: { sourceId: id } });   // ventes liées
        await prisma.achatEnergie.deleteMany({ where: { sourceId: id } });   // achats liés
        await prisma.sessionEnergie.deleteMany({ where: { sourceId: id } }); // sessions de production liées
        await prisma.stockEnergie.deleteMany({ where: { sourceId: id } });   // stock lié
        await prisma.seuilEnergie.deleteMany({ where: { sourceId: id } });   // seuil lié
        await prisma.sourceEnergie.delete({ where: { id } });                // enfin la source elle-même
        res.redirect('/energie?success=Source supprimée');
    } catch (e) { console.error(e); res.redirect('/energie?error=Erreur suppression source'); }
}

// POST /energie/seuils/save
// Enregistre (ou met à jour) le seuil d'une source : seuil de déclenchement,
// seuil d'arrêt, déclenchement automatique (oui/non) et statut (actif/inactif).
export async function postSaveSeuil(req, res) {
    // On extrait les champs du formulaire d'un coup (déstructuration).
    const { sourceId, seuilDeclenchement, seuilArret, declenchementAuto, statut } = req.body;
    try {
        const id = toInt(sourceId);
        if (id === null) return res.redirect('/energie?error=Source invalide');

        // Conversion des seuils en nombres positifs (null si le champ est vide/invalide).
        const sDecl = toPositiveFloat(seuilDeclenchement);
        const sArret = toPositiveFloat(seuilArret);
        const data = {
            seuilDeclenchement: sDecl === null ? 20 : sDecl,   // Défaut : 20 %.
            seuilArret:         sArret === null ? 10 : sArret, // Défaut : 10 %.
            declenchementAuto:  declenchementAuto === 'on',    // Case à cocher → booléen.
            statut:             isOneOf(statut, STATUTS_ACTIF) ? statut : 'ACTIF' // Valeur sûre ou 'ACTIF'.
        };
        // Règle métier : le seuil d'arrêt doit rester EN DESSOUS du seuil de déclenchement,
        // sinon la logique d'automatisation n'aurait aucun sens.
        if (data.seuilArret > data.seuilDeclenchement) {
            return res.redirect('/energie?error=Le seuil d\'arrêt doit être inférieur au seuil de déclenchement');
        }

        // upsert : met à jour le seuil existant de la source, ou le crée s'il n'existe pas encore.
        // (Une source ne peut avoir qu'un seul seuil → champ sourceId unique.)
        await prisma.seuilEnergie.upsert({ where: { sourceId: id }, update: data, create: { sourceId: id, ...data } });
        res.redirect('/energie?success=Seuil configuré');
    } catch (e) { console.error(e); res.redirect('/energie?error=Erreur configuration seuil'); }
}

// POST /energie/seuils/:id/delete
// Supprime un seuil identifié par son id.
export async function postDeleteSeuil(req, res) {
    try {
        await prisma.seuilEnergie.delete({ where: { id: parseInt(req.params.id) } });
        res.redirect('/energie?success=Seuil supprimé');
    } catch (e) { console.error(e); res.redirect('/energie?error=Erreur suppression seuil'); }
}

// GET /energie/prix-historique — prix moyens vente & achat sur 12 mois (depuis notre base locale).
// Renvoie du JSON : les libellés des 12 derniers mois + le prix moyen mensuel de
// vente et d'achat. Ces données alimentent le graphique affiché côté navigateur.
export async function apiPrixHistorique(req, res) {
    try {
        // Point de départ : on remonte 11 mois en arrière et on se cale au 1er jour à minuit
        // → on couvre ainsi 12 mois complets (les 11 précédents + le mois en cours).
        const depuis = new Date();
        depuis.setMonth(depuis.getMonth() - 11);
        depuis.setDate(1);
        depuis.setHours(0, 0, 0, 0);

        // On récupère en parallèle les ventes et les achats depuis cette date
        // (select : on ne charge que le prix et la date, le strict nécessaire au calcul).
        const [ventes, achats] = await Promise.all([
            prisma.venteEnergie.findMany({ where: { createdAt: { gte: depuis } }, select: { prixVente: true, createdAt: true } }),
            prisma.achatEnergie.findMany({ where: { createdAt: { gte: depuis } }, select: { prixAchat: true, createdAt: true } })
        ]);

        // On construit la liste ordonnée des 12 mois (du plus ancien au mois actuel).
        // Pour chaque mois on garde : un label affichable, l'année (y) et le mois (m) pour filtrer.
        const mois = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            mois.push({ label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }), y: d.getFullYear(), m: d.getMonth() });
        }

        // Calcule, pour chaque mois, le prix moyen des lignes de ce mois.
        // `rows` = ventes ou achats ; `key` = 'prixVente' ou 'prixAchat'.
        // Renvoie un tableau aligné sur `mois` (null quand un mois n'a aucune donnée).
        function moyennePrix(rows, key) {
            return mois.map(({ y, m }) => {
                // On garde uniquement les lignes dont l'année ET le mois correspondent.
                const filtres = rows.filter(r => {
                    const d = new Date(r.createdAt);
                    return d.getFullYear() === y && d.getMonth() === m;
                });
                if (!filtres.length) return null;       // Aucune donnée ce mois-là → null (trou dans le graphe).
                // Somme des prix puis division par le nombre de lignes = moyenne, arrondie à 2 décimales.
                const sum = filtres.reduce((acc, r) => acc + (r[key] ?? 0), 0);
                return Math.round((sum / filtres.length) * 100) / 100;
            });
        }

        // Réponse JSON : trois tableaux parallèles (même longueur, même ordre que les mois).
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
// Renvoie en JSON la liste des notifications énergie (le front la rafraîchit régulièrement).
export async function apiGetNotifications(req, res) {
    res.json(await getNotifications());
}

// POST /energie/notifications/clear
// Efface toutes les notifications puis confirme l'opération en JSON.
export async function apiClearNotifications(req, res) {
    await clearNotifications();
    res.json({ ok: true });
}
