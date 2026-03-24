/**
 * SMART-YIELD — Service Cours Matières Premières
 *
 * API : Alpha Vantage (https://alphavantage.co)
 * Plan : Gratuit à vie — sans carte bancaire — 25 req/jour
 * Inscription : https://www.alphavantage.co/support/#api-key (gratuit, immédiat)
 *
 * Clé .env : COMMODITY_API_KEY=ta_cle_alphavantage
 *
 * 5 matières × 1 appel = 5 req par refresh
 * Cache 13h → max 1 refresh/13h → ~10 req/jour → bien sous la limite de 25
 */

const CACHE_TTL_MS = 13 * 60 * 60 * 1000; // 13h

// ── Mapping matières → fonctions Alpha Vantage (FREE TIER) ───
export const COMMODITES = [
    { apiName: 'WTI',         nom: 'Pétrole WTI',   unite: 'Bbl',   categorie: 'Énergie' },
    { apiName: 'BRENT',       nom: 'Pétrole Brent', unite: 'Bbl',   categorie: 'Énergie' },
    { apiName: 'NATURAL_GAS', nom: 'Gaz naturel',   unite: 'MMBtu', categorie: 'Énergie' },
    { apiName: 'COPPER',      nom: 'Cuivre',        unite: 'Lb',    categorie: 'Métaux' },
    { apiName: 'ALUMINUM',    nom: 'Aluminium',     unite: 'T',     categorie: 'Métaux' },
];

// ── Cache ─────────────────────────────────────────────────────
const cache = { data: null, fetchedAt: 0 };

function isCacheValid() {
    return cache.data && (Date.now() - cache.fetchedAt) < CACHE_TTL_MS;
}

// ── Fetch un seul cours ──────────────────────────────────────
async function fetchSinglePrice(apiName, apiKey) {
    try {
        const url = `https://www.alphavantage.co/query?function=${apiName}&interval=monthly&apikey=${apiKey}`;
        const res = await fetch(url, {
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
            console.warn(`[commoditiesService] ${apiName} → HTTP ${res.status}`);
            return null;
        }

        const json = await res.json();

        if (json.Information) {
            console.warn('[commoditiesService] Limite journalière Alpha Vantage atteinte — réessai dans 24h');
            return null;
        }

        if (json['Error Message']) {
            console.warn(`[commoditiesService] ${apiName} non disponible :`, json['Error Message']);
            return null;
        }

        const entries = json.data;
        if (!Array.isArray(entries) || entries.length === 0) return null;

        const value = parseFloat(entries[0].value);
        if (isNaN(value)) return null;

        return Math.round(value * 100) / 100;

    } catch (err) {
        console.warn(`[commoditiesService] ${apiName} erreur :`, err.message);
        return null;
    }
}

// ── Fetch toutes les matières (séquentiel avec délai) ────────
async function fetchPrixMarche() {
    const apiKey = process.env.COMMODITY_API_KEY;
    if (!apiKey) {
        console.warn('[commoditiesService] COMMODITY_API_KEY manquant dans .env');
        return {};
    }

    const prix = {};

    for (const c of COMMODITES) {
        const price = await fetchSinglePrice(c.apiName, apiKey);
        if (price !== null) prix[c.apiName] = price;
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    return prix;
}

// ── API publique ─────────────────────────────────────────────
export async function getCoursMatieres() {
    try {
        if (isCacheValid()) return cache.data;

        const prix = await fetchPrixMarche();

        const result = COMMODITES.map(c => ({
            symbole:   c.apiName,
            nom:       c.nom,
            unite:     c.unite,
            categorie: c.categorie,
            prix:      prix[c.apiName] ?? null,
            isLive:    prix[c.apiName] !== undefined,
            variation: 0,
        }));

        if (result.some(r => r.isLive)) {
            cache.data      = result;
            cache.fetchedAt = Date.now();
        }

        return result;

    } catch (err) {
        console.error('[commoditiesService] Erreur globale :', err.message);
        return COMMODITES.map(c => ({
            symbole: c.apiName, nom: c.nom, unite: c.unite,
            categorie: c.categorie, prix: null, isLive: false, variation: 0,
        }));
    }
}