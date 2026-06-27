/**
 * SMART-YIELD — Service Énergie
 * ------------------------------------------------------------------
 * Ce fichier contient toute la "logique métier" de l'énergie, c'est-à-dire
 * le code qui ne s'occupe NI de l'affichage NI des routes, mais des calculs
 * et des accès à des ressources externes. Il fait deux grandes choses :
 *   1) Récupérer le "mix énergétique" français en temps réel via l'API ENTSO-E
 *      (quel pourcentage de l'électricité vient de l'éolien, du solaire, etc.).
 *   2) Gérer les notifications et l'automatisation : déclencher/arrêter des
 *      productions automatiquement selon ce mix et les seuils configurés.
 *
 * API utilisée : ENTSO-E Transparency Platform (gratuite).
 * Inscription : https://transparency.entsoe.eu → Mon Compte → Jeton API
 * Clé à mettre dans le fichier .env : ENTSOE_API_KEY=ton_token
 * Cache : on garde le résultat 1h en mémoire pour ne pas spammer l'API.
 */

// Client Prisma : c'est l'objet qui nous permet de lire/écrire dans la base de données.
import prisma from '../../prisma/prismaClient.js';
// Petit outil qui transforme du texte XML (le format renvoyé par ENTSO-E) en objet JavaScript.
import { XMLParser } from 'fast-xml-parser';
import { EventEmitter } from 'node:events';

// Émetteur d'événements pour pousser les notifications en temps réel (SSE) aux
// clients connectés. Le contrôleur s'y abonne ; pushNotification y émet 'new'.
export const notifEvents = new EventEmitter();

// Configuration du lecteur XML.
const xmlParser = new XMLParser({
    ignoreAttributes: true, // On ignore les attributs des balises XML, on ne veut que le contenu.
    // On force certains éléments à TOUJOURS être des tableaux (même s'il n'y en a qu'un seul).
    // Sans ça, l'API renvoie parfois un objet seul, parfois un tableau → bugs difficiles à reproduire.
    isArray: (name) => ['TimeSeries', 'Point'].includes(name)
});

// ── Notifications ────────────────────────────────────────────
// Les notifications (ex: "production déclenchée") sont stockées en base de données
// (table `notifications`) pour qu'elles survivent à un redémarrage du serveur.
// Si la table n'existe pas encore (migration non appliquée), on bascule sur un
// stockage temporaire en mémoire (le tableau `_notifications` ci-dessous).
const MAX_NOTIFS = 50;          // Nombre maximum de notifications conservées.
const _notifications = [];      // Stockage de secours en mémoire (perdu au redémarrage).

/**
 * Enregistre une nouvelle notification (production, vente…).
 * Tente d'abord l'écriture en base, puis supprime les plus anciennes au-delà de
 * MAX_NOTIFS ; si la base est indisponible, écrit en mémoire à la place.
 * @param {string} type — catégorie de la notification (ex: 'production', 'vente')
 * @param {string} message — texte à afficher à l'utilisateur
 */
export async function pushNotification(type, message) {
    const at = new Date(); // Heure actuelle (utilisée uniquement par le repli mémoire).
    try {
        // 1) On crée la notification en base de données.
        await prisma.notification.create({ data: { type, message } });
        // 2) On cherche les notifications "en trop" : triées de la plus récente à la
        //    plus ancienne, on saute les MAX_NOTIFS premières → il reste le surplus.
        const surplus = await prisma.notification.findMany({
            orderBy: { createdAt: 'desc' }, select: { id: true }, skip: MAX_NOTIFS
        });
        // 3) S'il y a un surplus, on supprime ces lignes pour ne pas faire grossir la table.
        if (surplus.length) {
            await prisma.notification.deleteMany({ where: { id: { in: surplus.map(n => n.id) } } });
        }
    } catch {
        // La base a échoué (ex: table absente) → on stocke en mémoire.
        // unshift = ajoute en tête de tableau (le plus récent en premier).
        _notifications.unshift({ type, message, at: at.toISOString() });
        // On ne garde que MAX_NOTIFS éléments : pop() retire le plus ancien (en fin de tableau).
        if (_notifications.length > MAX_NOTIFS) _notifications.pop();
    }
    // Signale aux clients connectés (SSE) qu'une notification vient d'arriver.
    notifEvents.emit('new');
}

/**
 * Récupère les dernières notifications (les plus récentes en premier).
 * @returns {Promise<Array<{type, message, at}>>} liste limitée à MAX_NOTIFS éléments
 */
export async function getNotifications() {
    try {
        // On lit en base, triées de la plus récente à la plus ancienne, limitées à MAX_NOTIFS.
        const rows = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: MAX_NOTIFS });
        // On reformate chaque ligne pour ne renvoyer que les champs utiles au front (et une date en texte).
        return rows.map(r => ({ type: r.type, message: r.message, at: r.createdAt.toISOString() }));
    } catch {
        // Base indisponible → on renvoie une copie du tableau mémoire ([...] = copie, pas la référence).
        return [..._notifications];
    }
}

/** Vide toutes les notifications (en base, ou en mémoire si la base est indisponible). */
export async function clearNotifications() {
    try {
        await prisma.notification.deleteMany({}); // {} = aucune condition → supprime TOUT.
    } catch {
        _notifications.length = 0; // Astuce pour vider un tableau en place.
    }
}

// ── Constantes de l'API ENTSO-E ──────────────────────────────
const CACHE_TTL_MS = 60 * 60 * 1000;            // Durée de vie du cache : 1 heure (en millisecondes).
const ENTSOE_BASE = 'https://web-api.tp.entsoe.eu/api'; // URL de base de l'API.
const FRANCE_DOMAIN = '10YFR-RTE------C';       // Code identifiant la zone "France" chez ENTSO-E.

// Délai d'abandon de l'appel ENTSO-E. En production on laisse 10s (l'API peut être lente).
// En dev/test on coupe court (3s) pour ne pas bloquer le chargement des pages quand l'API
// est injoignable. Surchargeable via la variable d'environnement ENTSOE_TIMEOUT_MS.
const FETCH_TIMEOUT_MS = Number(process.env.ENTSOE_TIMEOUT_MS)
    || (process.env.NODE_ENV === 'production' ? 10000 : 3000);

// Nombre de tentatives pour un même rafraîchissement. L'API ENTSO-E répond
// normalement en moins d'1s ; quand elle est injoignable, elle ne renvoie RIEN
// et l'appel pend jusqu'au timeout. Comme ces blocages sont intermittents, on
// réessaie quelques fois (timeout court) avant d'abandonner. Surchargeable via
// ENTSOE_RETRIES (1 = aucune nouvelle tentative).
const FETCH_RETRIES = Math.max(1, Number(process.env.ENTSOE_RETRIES) || 2);

// Correspondance entre les codes "type de production" d'ENTSO-E (B10, B16…)
// et nos catégories internes lisibles. Les codes absents de cette table sont ignorés.
const PSR_MAP = {
    B19: 'EOLIEN', B18: 'EOLIEN',                       // éolien terrestre + en mer
    B16: 'SOLAIRE',
    B10: 'HYDRAULIQUE', B11: 'HYDRAULIQUE', B12: 'HYDRAULIQUE', // différents types d'hydraulique
    B14: 'NUCLEAIRE',
};

// Le cache : `data` contient le dernier mix calculé, `fetchedAt` l'heure (en ms) où on l'a obtenu.
const cache = { data: null, fetchedAt: 0 };

// Promesse du fetch en cours (anti-rafale). null = aucun fetch en cours.
// Voir getMixEnergetique() : les appels concurrents partagent cette même promesse.
let _inFlight = null;

// Renvoie true si on a déjà des données ET qu'elles datent de moins d'1h.
function isCacheValid() {
    return cache.data && (Date.now() - cache.fetchedAt) < CACHE_TTL_MS;
}

// Formate une date au format exact attendu par ENTSO-E : AAAAMMJJHH00 (en heure UTC).
// Ex: le 26/06/2026 à 14h → "202606261400".
function fmtDate(d) {
    const p = n => String(n).padStart(2, '0'); // Ajoute un zéro devant si besoin (6 → "06").
    // getUTCMonth() renvoie 0 à 11, on ajoute donc +1 pour avoir le vrai numéro de mois.
    return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}00`;
}

// Transforme la réponse XML d'ENTSO-E en un "mix énergétique" : pour chaque type
// d'énergie, son pourcentage de la production totale. Renvoie null si rien d'exploitable.
function parseGenerationXML(xml) {
    const mix = {};   // Accumulateur : { EOLIEN: 1200, SOLAIRE: 300, ... } en MW (mégawatts).
    let total = 0;    // Production totale, pour ensuite calculer les pourcentages.

    const parsed = xmlParser.parse(xml); // XML → objet JavaScript.
    // ENTSO-E enveloppe les données de type A75 dans une balise GL_MarketDocument.
    const doc = parsed.GL_MarketDocument || parsed;
    const timeSeries = doc.TimeSeries || []; // Liste des séries (une par type de production).

    // On parcourt chaque série temporelle.
    for (const ts of timeSeries) {
        const psrType = ts.MktPSRType?.psrType; // Le code du type de production (B16, B14…).
        if (!psrType) continue;                  // Pas de code → on ignore cette série.
        const type = PSR_MAP[psrType];           // On traduit le code en catégorie interne.
        if (!type) continue;                     // Type non suivi (ex: gaz) → on ignore.
        const period = ts.Period;
        if (!period) continue;                   // Pas de période de mesure → on ignore.
        const points = period.Point || [];       // Les points de mesure dans le temps.
        if (!points.length) continue;            // Aucun point → on ignore.

        // On prend le DERNIER point (la mesure la plus récente de la série).
        const qty = parseFloat(points[points.length - 1].quantity);
        if (isNaN(qty) || qty < 0) continue;     // Valeur invalide ou négative → on ignore.
        mix[type] = (mix[type] || 0) + qty;      // On cumule (plusieurs codes → même catégorie).
        total += qty;                            // On met à jour le total.
    }
    if (total === 0) return null; // Rien de récupéré → on signale l'absence de données.

    // On prépare le résultat avec deux champs "techniques" préfixés par _ :
    // _totalMW = puissance totale, _fetchedAt = heure de récupération.
    const result = { _totalMW: Math.round(total), _fetchedAt: new Date().toISOString() };
    // Pour chaque type, on convertit les MW en pourcentage du total (arrondi à l'entier).
    for (const [type, qty] of Object.entries(mix)) {
        result[type] = Math.round((qty / total) * 100);
    }
    return result; // ex: { EOLIEN: 12, SOLAIRE: 5, NUCLEAIRE: 70, _totalMW: 45000, _fetchedAt: '...' }
}

// UNE seule tentative d'appel à l'API ENTSO-E (fenêtre des dernières 24h).
//  - Renvoie le mix analysé si tout va bien.
//  - Renvoie null si l'API a RÉPONDU mais sans données exploitables (code HTTP
//    d'erreur, balise <Reason>, mix vide) → inutile de réessayer dans ce cas.
//  - LÈVE une exception si l'appel échoue côté réseau/timeout → cas réessayable,
//    géré par fetchMixEnergetique().
async function fetchMixOnce(apiKey) {
    const now = new Date();
    // On demande les données sur une fenêtre de 24h (de maintenant - 24h jusqu'à maintenant).
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    // Construction de l'URL avec tous les paramètres exigés par ENTSO-E :
    // documentType=A75 (production réelle), processType=A16 (réalisé), in_Domain=France.
    const url = `${ENTSOE_BASE}?securityToken=${apiKey}&documentType=A75&processType=A16&in_Domain=${FRANCE_DOMAIN}&periodStart=${fmtDate(start)}&periodEnd=${fmtDate(now)}`;
    // Appel HTTP. AbortSignal.timeout = on abandonne si l'API ne répond pas dans le délai
    // configuré (3s en dev, 10s en prod — voir FETCH_TIMEOUT_MS). Un dépassement lève
    // une exception, attrapée par fetchMixEnergetique() pour réessayer.
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) { console.warn(`[energieService] HTTP ${res.status}`); return null; } // Code HTTP d'erreur.
    const xml = await res.text(); // On récupère le corps de la réponse en texte (XML).

    // ENTSO-E signale ses erreurs métier en mettant une balise <Reason> dans le XML.
    if (xml.includes('<Reason>')) {
        const parsedError = xmlParser.parse(xml);
        // En cas d'erreur, l'enveloppe s'appelle Acknowledgement_MarketDocument.
        const doc = parsedError.Acknowledgement_MarketDocument || parsedError;
        // Il peut y avoir plusieurs raisons : on sécurise l'accès à la première.
        const reason = Array.isArray(doc.Reason) ? doc.Reason[0] : doc.Reason;
        console.warn('[energieService] Erreur ENTSO-E', reason?.code, ':', reason?.text);
        return null;
    }
    return parseGenerationXML(xml); // Tout va bien → on analyse le XML.
}

// Appelle l'API ENTSO-E avec retry. L'API est intermittente : quand elle est
// injoignable, elle ne répond pas du tout (l'appel pend jusqu'au timeout). Comme
// ces blocages sont passagers, on réessaie FETCH_RETRIES fois avant d'abandonner.
// Renvoie le mix énergétique analysé, ou null (clé manquante / API en erreur /
// toutes les tentatives ont échoué).
async function fetchMixEnergetique() {
    const apiKey = process.env.ENTSOE_API_KEY; // Clé d'accès, lue depuis le fichier .env.
    if (!apiKey) { console.warn('[energieService] ENTSOE_API_KEY manquant'); return null; }
    let lastErr; // Mémorise la dernière erreur réseau pour le log final.
    for (let attempt = 1; attempt <= FETCH_RETRIES; attempt++) {
        try {
            // fetchMixOnce ne lève QUE pour les échecs réseau/timeout (réessayables).
            // Tout autre cas (mix, ou null pour HTTP/Reason) sort immédiatement de la boucle.
            return await fetchMixOnce(apiKey);
        } catch (err) {
            lastErr = err; // Échec réseau/timeout → on retentera si des tentatives restent.
        }
    }
    // Toutes les tentatives ont échoué : on ne fait pas planter l'app, on renvoie null.
    console.warn(`[energieService] Erreur fetch (après ${FETCH_RETRIES} tentatives) :`, lastErr?.message);
    return null;
}

/**
 * Renvoie le mix énergétique français actuel (pourcentage par type d'énergie).
 * Utilise le cache si possible, sinon interroge l'API ENTSO-E et met le cache à jour.
 * C'est CETTE fonction que le reste de l'application appelle (les autres sont internes).
 * @returns {Promise<object|null>} le mix (ex: { EOLIEN: 12, SOLAIRE: 5, _totalMW, _fetchedAt }) ou null
 */
export async function getMixEnergetique() {
    try {
        if (isCacheValid()) return cache.data; // Données récentes en cache → on les renvoie direct.

        // Anti-rafale (coalescing) : un seul appel réseau à la fois. Si plusieurs pages
        // chargent en même temps (cache froid / expiré), elles PARTAGENT le même fetch
        // au lieu d'en lancer chacune un → évite de spammer l'API et de se faire throttler.
        if (!_inFlight) {
            _inFlight = fetchMixEnergetique().finally(() => { _inFlight = null; });
        }
        const mix = await _inFlight; // Tous les appelants concurrents attendent la même promesse.

        if (mix) { cache.data = mix; cache.fetchedAt = Date.now(); return mix; } // Succès → cache à jour.
        // Échec du rafraîchissement : on sert la dernière donnée connue (même périmée)
        // plutôt que rien, pour garder un affichage. Renvoie null seulement si on n'a
        // jamais réussi un seul appel depuis le démarrage.
        return cache.data;
    } catch (err) {
        console.error('[energieService]', err.message);
        return cache.data; // En cas d'imprévu, on retombe aussi sur la dernière donnée connue.
    }
}

/**
 * Cœur de l'automatisation énergie : compare le mix actuel aux seuils configurés
 * et déclenche automatiquement les actions correspondantes.
 *  - Si la part d'une source dans le mix DÉPASSE son seuil de déclenchement → on démarre une production.
 *  - Si la part PASSE SOUS le seuil d'arrêt → on termine les productions en cours et on vend le stock.
 * Chaque action génère une notification. Cette fonction est pensée pour être
 * appelée régulièrement (ex: toutes les heures par une tâche planifiée dans server.js).
 */
export async function verifierDeclenchements() {
    try {
        const mix = await getMixEnergetique(); // 1) On récupère le mix actuel.
        if (!mix) return;                      // Pas de données → on ne fait rien cette fois.

        // 2) On charge tous les seuils ACTIFS et en mode automatique.
        //    include : on récupère aussi la source liée et son stock en une seule requête.
        const seuils = await prisma.seuilEnergie.findMany({
            where: { declenchementAuto: true, statut: 'ACTIF' },
            include: { source: { include: { stock: true } } }
        });

        // 3) On traite chaque seuil un par un.
        for (const seuil of seuils) {
            const source = seuil.source;
            if (!source.actif) continue;            // Source désactivée → on saute.
            const mixPct = mix[source.type] ?? 0;   // Part actuelle de ce type d'énergie (0 si absent).

            // ─── Cas 1 : DÉCLENCHER une production ───
            // La part de la source dépasse (ou égale) son seuil de déclenchement.
            if (mixPct >= seuil.seuilDeclenchement) {
                // On vérifie d'abord qu'une production n'est pas DÉJÀ en cours (sinon doublon).
                const enCours = await prisma.sessionEnergie.findFirst({
                    where: { sourceId: source.id, statut: 'EN_COURS' }
                });
                if (!enCours) {
                    // Aucune production en cours → on en crée une nouvelle, marquée 'AUTO'.
                    await prisma.sessionEnergie.create({
                        data: {
                            sourceId: source.id, titre: `AUTO — ${source.nom}`,
                            quantitePrevue: 0, debutPrev: new Date(),
                            finPrev: new Date(Date.now() + 3600000), // fin prévue dans 1h (3 600 000 ms).
                            statut: 'EN_COURS', declenchement: 'AUTO'
                        }
                    });
                    // On informe l'utilisateur via une notification + un log serveur.
                    await pushNotification('production', `Production déclenchée automatiquement : ${source.nom} (mix ${source.type} : ${mixPct}% ≥ seuil ${seuil.seuilDeclenchement}%)`);
                    console.log(`[energieService] AUTO → Production déclenchée : ${source.nom}`);
                }
            }

            // ─── Cas 2 : ARRÊTER les productions et VENDRE le stock ───
            // La part de la source est passée sous son seuil d'arrêt.
            if (mixPct < seuil.seuilArret) {
                // Toutes les productions encore en cours pour cette source.
                const sessions = await prisma.sessionEnergie.findMany({
                    where: { sourceId: source.id, statut: 'EN_COURS' }
                });

                // On prépare une liste d'opérations DB qu'on exécutera ensemble (transaction).
                const operationsDb = [];

                for (const s of sessions) {
                    // a) On marque la session comme TERMINÉE et on note l'heure de fin réelle.
                    operationsDb.push(prisma.sessionEnergie.update({
                        where: { id: s.id },
                        data: { statut: 'TERMINEE', finReel: new Date() }
                    }));
                    // b) On ajoute la quantité produite au stock de la source.
                    //    upsert : met à jour le stock s'il existe (increment), sinon le crée.
                    operationsDb.push(prisma.stockEnergie.upsert({
                        where: { sourceId: source.id },
                        update: { quantite: { increment: s.quantiteProduite } },
                        create: { sourceId: source.id, quantite: s.quantiteProduite }
                    }));
                }

                const stockActuel = source.stock?.quantite ?? 0; // Stock avant la vente (0 si aucun stock).
                let venteAjoutee = false;                        // Pour savoir s'il faut notifier la vente.

                // S'il y a du stock à vendre, on crée une vente et on remet le stock à 0.
                if (stockActuel > 0) {
                    operationsDb.push(prisma.venteEnergie.create({
                        // On vend au coût de production (total = quantité × prix unitaire).
                        data: { sourceId: source.id, quantite: stockActuel, prixVente: source.coutProduction, total: stockActuel * source.coutProduction }
                    }));
                    operationsDb.push(prisma.stockEnergie.update({ where: { sourceId: source.id }, data: { quantite: 0 } }));
                    venteAjoutee = true;
                }

                // On exécute TOUTES les opérations d'un seul coup, dans une transaction :
                // soit tout réussit, soit rien n'est appliqué (cohérence des données garantie).
                if (operationsDb.length > 0) {
                    await prisma.$transaction(operationsDb);
                    if (venteAjoutee) {
                        await pushNotification('vente', `Vente automatique : ${source.nom} — ${stockActuel} MWh à ${source.coutProduction} €/MWh (mix ${source.type} : ${mixPct}% < seuil arrêt ${seuil.seuilArret}%)`);
                        console.log(`[energieService] AUTO → Vente déclenchée : ${source.nom}`);
                    }
                }
            }
        }
    } catch (err) {
        // On attrape toute erreur pour ne jamais faire planter la tâche planifiée.
        console.error('[energieService] verifierDeclenchements:', err.message);
    }
}
