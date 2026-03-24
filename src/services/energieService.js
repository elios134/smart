/**
 * SMART-YIELD — Service Énergie
 *
 * API : ENTSO-E Transparency Platform (https://transparency.entsoe.eu)
 * Plan : Gratuit — inscription sur transparency.entsoe.eu → Mon Compte → Jeton API
 * Clé .env : ENTSOE_API_KEY=ton_token_entsoe
 *
 * Données : Production réelle par type de source — France (FR)
 * Mise à jour : toutes les heures (cache 1h)
 *
 * PSR types utilisés :
 *   B19 + B18 → EOLIEN    (Wind Onshore + Offshore)
 *   B16       → SOLAIRE   (Solar)
 *   B10+B11+B12 → HYDRAULIQUE (Hydro)
 *   B14       → NUCLEAIRE (contexte)
 *
 * Logique de déclenchement automatique :
 *   mix EOLIEN ≥ seuilDeclenchement% → lancer production (source abondante = bon marché)
 *   mix EOLIEN < seuilArret%         → stopper production + déclencher vente du stock
 */

import prisma from '../../prisma/prismaClient.js';

const CACHE_TTL_MS   = 60 * 60 * 1000; // 1h
const ENTSOE_BASE    = 'https://web-api.tp.entsoe.eu/api';
const FRANCE_DOMAIN  = '10YFR-RTE------C';

// PSR type → TypeSource
const PSR_MAP = {
    B19: 'EOLIEN',
    B18: 'EOLIEN',
    B16: 'SOLAIRE',
    B10: 'HYDRAULIQUE',
    B11: 'HYDRAULIQUE',
    B12: 'HYDRAULIQUE',
    B14: 'NUCLEAIRE',
};

const cache = { data: null, fetchedAt: 0 };

function isCacheValid() {
    return cache.data && (Date.now() - cache.fetchedAt) < CACHE_TTL_MS;
}

// ── Formatage date pour ENTSO-E : YYYYMMDDHHMM ──────────────
function fmtDate(d) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}00`;
}

// ── Parser XML léger (pas de dépendance externe) ─────────────
function parseGenerationXML(xml) {
    const mix = {};
    let total = 0;

    // Extraire tous les blocs TimeSeries
    const tsBlocks = xml.match(/<TimeSeries[\s\S]*?<\/TimeSeries>/g) || [];

    for (const ts of tsBlocks) {
        const psrMatch = ts.match(/<psrType>(B\d+)<\/psrType>/);
        if (!psrMatch) continue;

        const type = PSR_MAP[psrMatch[1]];
        if (!type) continue;

        // Prendre la dernière quantité disponible dans ce TimeSeries
        const qtMatches = [...ts.matchAll(/<quantity>([\d.]+)<\/quantity>/g)];
        if (qtMatches.length === 0) continue;

        const qty = parseFloat(qtMatches[qtMatches.length - 1][1]);
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

// ── Fetch ENTSO-E — mix de production FR ────────────────────
async function fetchMixEnergetique() {
    const apiKey = process.env.ENTSOE_API_KEY;
    if (!apiKey) {
        console.warn('[energieService] ENTSOE_API_KEY manquant dans .env');
        return null;
    }

    try {
        const now   = new Date();
        const start = new Date(now.getTime() - 2 * 60 * 60 * 1000); // -2h

        const url = `${ENTSOE_BASE}?securityToken=${apiKey}` +
            `&documentType=A75&processType=A16` +
            `&in_Domain=${FRANCE_DOMAIN}` +
            `&periodStart=${fmtDate(start)}&periodEnd=${fmtDate(now)}`;

        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

        if (!res.ok) {
            console.warn(`[energieService] ENTSO-E HTTP ${res.status}`);
            return null;
        }

        const xml = await res.text();

        // Erreur API dans le corps XML
        if (xml.includes('<Reason>')) {
            const codeMatch = xml.match(/<code>(.*?)<\/code>/);
            const textMatch = xml.match(/<text>(.*?)<\/text>/);
            console.warn(`[energieService] ENTSO-E erreur ${codeMatch?.[1]} : ${textMatch?.[1]}`);
            return null;
        }

        return parseGenerationXML(xml);

    } catch (err) {
        console.warn('[energieService] Erreur fetch ENTSO-E :', err.message);
        return null;
    }
}

// ── API publique — mix FR (avec cache 1h) ────────────────────
export async function getMixEnergetique() {
    try {
        if (isCacheValid()) return cache.data;

        const mix = await fetchMixEnergetique();

        if (mix) {
            cache.data      = mix;
            cache.fetchedAt = Date.now();
        }

        return mix;
    } catch (err) {
        console.error('[energieService] Erreur getMixEnergetique :', err.message);
        return null;
    }
}

// ── Vérification automatique des seuils ─────────────────────
// Appelée toutes les heures depuis server.js via setInterval
export async function verifierDeclenchements() {
    try {
        const mix = await getMixEnergetique();
        if (!mix) return;

        const seuils = await prisma.seuilEnergie.findMany({
            where:   { declenchementAuto: true, statut: 'ACTIF' },
            include: { source: { include: { stock: true } } }
        });

        for (const seuil of seuils) {
            const source    = seuil.source;
            if (!source.actif) continue;

            // Récupérer le % du mix national correspondant au type de source
            const mixPct = mix[source.type] ?? 0;

            // ── DÉCLENCHEMENT production ──────────────────────────
            if (mixPct >= seuil.seuilDeclenchement) {
                // Vérifier qu'il n'y a pas déjà une production EN_COURS pour cette source
                const enCours = await prisma.productionEnergie.findFirst({
                    where: { sourceId: source.id, statut: 'EN_COURS' }
                });
                if (!enCours) {
                    await prisma.productionEnergie.create({
                        data: {
                            sourceId:      source.id,
                            quantite:      0,
                            coutTotal:     0,
                            debutProd:     new Date(),
                            statut:        'EN_COURS',
                            declenchement: 'AUTO'
                        }
                    });
                    console.log(`[energieService] AUTO → Production déclenchée : ${source.nom} (mix ${source.type} = ${mixPct}%)`);
                }
            }

            // ── ARRÊT + VENTE ─────────────────────────────────────
            if (mixPct < seuil.seuilArret) {
                // Terminer toutes les productions EN_COURS de cette source
                const productions = await prisma.productionEnergie.findMany({
                    where: { sourceId: source.id, statut: 'EN_COURS' }
                });

                for (const prod of productions) {
                    await prisma.productionEnergie.update({
                        where: { id: prod.id },
                        data:  { statut: 'TERMINEE', finProd: new Date() }
                    });
                    // Incrémenter le stock
                    await prisma.stockEnergie.upsert({
                        where:  { sourceId: source.id },
                        update: { quantite: { increment: prod.quantite } },
                        create: { sourceId: source.id, quantite: prod.quantite }
                    });
                }

                // Vendre le stock disponible
                const stockActuel = source.stock?.quantite ?? 0;
                if (stockActuel > 0) {
                    const total = stockActuel * source.coutProduction;
                    await prisma.venteEnergie.create({
                        data: {
                            sourceId:  source.id,
                            quantite:  stockActuel,
                            prixVente: source.coutProduction,
                            total
                        }
                    });
                    await prisma.stockEnergie.update({
                        where: { sourceId: source.id },
                        data:  { quantite: 0 }
                    });
                    console.log(`[energieService] AUTO → Vente déclenchée : ${source.nom} — ${stockActuel} MWh (mix ${source.type} = ${mixPct}%)`);
                }
            }
        }
    } catch (err) {
        console.error('[energieService] Erreur verifierDeclenchements :', err.message);
    }
}
