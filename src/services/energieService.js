/**
 * SMART-YIELD — Service Énergie
 * API : ENTSO-E Transparency Platform (gratuit)
 * Inscription : https://transparency.entsoe.eu → Mon Compte → Jeton API
 * Clé .env : ENTSOE_API_KEY=ton_token
 * Cache : 1h in-memory
 */

import prisma from '../../prisma/prismaClient.js';
import { XMLParser } from 'fast-xml-parser';

const xmlParser = new XMLParser({
    ignoreAttributes: true,
    // On force les éléments pouvant être multiples à être systématiquement des tableaux 
    // Cela évite les bugs si l'API ne renvoie exceptionnellement qu'un seul élément
    isArray: (name) => ['TimeSeries', 'Point'].includes(name)
});

// ── Notifications en mémoire ─────────────────────────────────
const _notifications = [];
export function pushNotification(type, message) {
    _notifications.unshift({ type, message, at: new Date().toISOString() });
    if (_notifications.length > 50) _notifications.pop();
}
export function getNotifications() { return [..._notifications]; }
export function clearNotifications() { _notifications.length = 0; }

const CACHE_TTL_MS = 60 * 60 * 1000;
const ENTSOE_BASE = 'https://web-api.tp.entsoe.eu/api';
const FRANCE_DOMAIN = '10YFR-RTE------C';

const PSR_MAP = {
    B19: 'EOLIEN', B18: 'EOLIEN',
    B16: 'SOLAIRE',
    B10: 'HYDRAULIQUE', B11: 'HYDRAULIQUE', B12: 'HYDRAULIQUE',
    B14: 'NUCLEAIRE',
};

const cache = { data: null, fetchedAt: 0 };

function isCacheValid() {
    return cache.data && (Date.now() - cache.fetchedAt) < CACHE_TTL_MS;
}

function fmtDate(d) {
    const p = n => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}00`;
}

function parseGenerationXML(xml) {
    const mix = {};
    let total = 0;

    const parsed = xmlParser.parse(xml);
    // ENTSO-E enveloppe ses données A75 dans GL_MarketDocument
    const doc = parsed.GL_MarketDocument || parsed;
    const timeSeries = doc.TimeSeries || [];

    for (const ts of timeSeries) {
        const psrType = ts.MktPSRType?.psrType;
        if (!psrType) continue;
        const type = PSR_MAP[psrType];
        if (!type) continue;
        const period = ts.Period;
        if (!period) continue;
        const points = period.Point || [];
        if (!points.length) continue;

        const qty = parseFloat(points[points.length - 1].quantity);
        if (isNaN(qty) || qty < 0) continue;
        mix[type] = (mix[type] || 0) + qty;
        total += qty;
    }
    if (total === 0) return null;
    const result = { _totalMW: Math.round(total), _fetchedAt: new Date().toISOString() };
    for (const [type, qty] of Object.entries(mix)) {
        result[type] = Math.round((qty / total) * 100);
    }
    return result;
}

async function fetchMixEnergetique() {
    const apiKey = process.env.ENTSOE_API_KEY;
    if (!apiKey) { console.warn('[energieService] ENTSOE_API_KEY manquant'); return null; }
    try {
        const now = new Date();
        const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const url = `${ENTSOE_BASE}?securityToken=${apiKey}&documentType=A75&processType=A16&in_Domain=${FRANCE_DOMAIN}&periodStart=${fmtDate(start)}&periodEnd=${fmtDate(now)}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) { console.warn(`[energieService] HTTP ${res.status}`); return null; }
        const xml = await res.text();
        if (xml.includes('<Reason>')) {
            const parsedError = xmlParser.parse(xml);
            // ENTSO-E renvoie un Acknowledgement_MarketDocument lors des erreurs
            const doc = parsedError.Acknowledgement_MarketDocument || parsedError;
            // Il peut y avoir plusieurs raisons, on sécurise l'accès à la première
            const reason = Array.isArray(doc.Reason) ? doc.Reason[0] : doc.Reason;
            console.warn('[energieService] Erreur ENTSO-E', reason?.code, ':', reason?.text);
            return null;
        }
        return parseGenerationXML(xml);
    } catch (err) {
        console.warn('[energieService] Erreur fetch:', err.message);
        return null;
    }
}

export async function getMixEnergetique() {
    try {
        if (isCacheValid()) return cache.data;
        const mix = await fetchMixEnergetique();
        if (mix) { cache.data = mix; cache.fetchedAt = Date.now(); }
        return mix;
    } catch (err) {
        console.error('[energieService]', err.message);
        return null;
    }
}

export async function verifierDeclenchements() {
    try {
        const mix = await getMixEnergetique();
        if (!mix) return;

        const seuils = await prisma.seuilEnergie.findMany({
            where: { declenchementAuto: true, statut: 'ACTIF' },
            include: { source: { include: { stock: true } } }
        });

        for (const seuil of seuils) {
            const source = seuil.source;
            if (!source.actif) continue;
            const mixPct = mix[source.type] ?? 0;

            // Déclencher production
            if (mixPct >= seuil.seuilDeclenchement) {
                const enCours = await prisma.sessionEnergie.findFirst({
                    where: { sourceId: source.id, statut: 'EN_COURS' }
                });
                if (!enCours) {
                    await prisma.sessionEnergie.create({
                        data: {
                            sourceId: source.id, titre: `AUTO — ${source.nom}`,
                            quantitePrevue: 0, debutPrev: new Date(),
                            finPrev: new Date(Date.now() + 3600000),
                            statut: 'EN_COURS', declenchement: 'AUTO'
                        }
                    });
                    pushNotification('production', `Production déclenchée automatiquement : ${source.nom} (mix ${source.type} : ${mixPct}% ≥ seuil ${seuil.seuilDeclenchement}%)`);
                    console.log(`[energieService] AUTO → Production déclenchée : ${source.nom}`);
                }
            }

            // Arrêt + vente
            if (mixPct < seuil.seuilArret) {
                const sessions = await prisma.sessionEnergie.findMany({
                    where: { sourceId: source.id, statut: 'EN_COURS' }
                });

                const operationsDb = [];

                for (const s of sessions) {
                    operationsDb.push(prisma.sessionEnergie.update({
                        where: { id: s.id },
                        data: { statut: 'TERMINEE', finReel: new Date() }
                    }));
                    operationsDb.push(prisma.stockEnergie.upsert({
                        where: { sourceId: source.id },
                        update: { quantite: { increment: s.quantiteProduite } },
                        create: { sourceId: source.id, quantite: s.quantiteProduite }
                    }));
                }

                const stockActuel = source.stock?.quantite ?? 0;
                let venteAjoutee = false;

                if (stockActuel > 0) {
                    operationsDb.push(prisma.venteEnergie.create({
                        data: { sourceId: source.id, quantite: stockActuel, prixVente: source.coutProduction, total: stockActuel * source.coutProduction }
                    }));
                    operationsDb.push(prisma.stockEnergie.update({ where: { sourceId: source.id }, data: { quantite: 0 } }));
                    venteAjoutee = true;
                }

                // On exécute toutes les opérations d'un seul coup
                if (operationsDb.length > 0) {
                    await prisma.$transaction(operationsDb);
                    if (venteAjoutee) {
                        pushNotification('vente', `Vente automatique : ${source.nom} — ${stockActuel} MWh à ${source.coutProduction} €/MWh (mix ${source.type} : ${mixPct}% < seuil arrêt ${seuil.seuilArret}%)`);
                        console.log(`[energieService] AUTO → Vente déclenchée : ${source.nom}`);
                    }
                }
            }
        }
    } catch (err) {
        console.error('[energieService] verifierDeclenchements:', err.message);
    }
}
