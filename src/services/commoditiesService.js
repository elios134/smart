/**
 * SMART-YIELD — Service Cours Matières Premières
 *
 * API : CommodityPriceAPI (https://commoditypriceapi.com)
 * Plan : Gratuit à vie — sans carte bancaire — 2 000 req/mois
 * Avantage : 1 seul appel pour toutes les matières (vs N appels avec API Ninjas)
 *
 * Clé .env : COMMODITY_API_KEY=ta_cle_commoditypriceapi
 * Inscription : https://commoditypriceapi.com (gratuit, no CB)
 *
 * Cache : 1h in-memory → ~720 req/mois max → bien sous la limite free
 */

const CACHE_TTL_MS = 180 * 60 * 1000; // 1h

// ── Mapping matières → symboles CommodityPriceAPI ────────────
// Vérifier/compléter les symboles via : GET /v2/symbols?apiKey=YOUR_KEY
export const COMMODITES = [
    { apiName: 'XAU',         nom: 'Or',            unite: 'T.oz',   categorie: 'Métaux précieux' },
    { apiName: 'XAG',         nom: 'Argent',        unite: 'T.oz',   categorie: 'Métaux précieux' },
    { apiName: 'PLATINUM',    nom: 'Platine',       unite: 'T.oz',   categorie: 'Métaux précieux' },
    { apiName: 'PALLADIUM',   nom: 'Palladium',     unite: 'T.oz',   categorie: 'Métaux précieux' },
    { apiName: 'COPPER',      nom: 'Cuivre',        unite: 'Lb',     categorie: 'Métaux' },
    { apiName: 'WTIOIL-FUT',  nom: 'Pétrole WTI',   unite: 'Bbl',    categorie: 'Énergie' },
    { apiName: 'BRENTOIL-FUT',nom: 'Pétrole Brent', unite: 'Bbl',    categorie: 'Énergie' },
    { apiName: 'NG-FUT',      nom: 'Gaz naturel',   unite: 'MMBtu',  categorie: 'Énergie' },
    { apiName: 'CORN-FUT',    nom: 'Maïs',          unite: 'Bushel', categorie: 'Agricole' },
    { apiName: 'COFFEE-FUT',  nom: 'Café',          unite: 'Lb',     categorie: 'Agricole' },
    { apiName: 'COCOA-FUT',   nom: 'Cacao',         unite: 'T',      categorie: 'Agricole' },
    { apiName: 'SUGAR-FUT',   nom: 'Sucre',         unite: 'Lb',     categorie: 'Agricole' },
];

// ── Cache ─────────────────────────────────────────────────────
const cache = { data: null, fetchedAt: 0 };

function isCacheValid() {
    return cache.data && (Date.now() - cache.fetchedAt) < CACHE_TTL_MS;
}

// ── Fetch tous les cours en un seul appel ────────────────────
async function fetchPrixMarche() {
    const apiKey = process.env.COMMODITY_API_KEY;
    if (!apiKey) {
        console.warn('[commoditiesService] COMMODITY_API_KEY manquant dans .env');
        return {};
    }

    const symbols = COMMODITES.map(c => c.apiName).join(',');
    const url = `https://api.commoditypriceapi.com/v2/rates/latest?symbols=${symbols}`;

    try {
        const res = await fetch(url, {
            headers: { 'x-api-key': apiKey },
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
            console.warn(`[commoditiesService] HTTP ${res.status}`);
            return {};
        }

        const json = await res.json();

        // Réponse : { success: true, rates: { "WTIOIL-FUT": 72.29, "XAU": 2066.98, ... } }
        if (!json.success || !json.rates) {
            console.warn('[commoditiesService] Réponse inattendue :', JSON.stringify(json).slice(0, 200));
            return {};
        }

        // Arrondir à 2 décimales
        const prix = {};
        for (const [symbol, value] of Object.entries(json.rates)) {
            if (value !== null && value !== undefined) {
                prix[symbol] = Math.round(value * 100) / 100;
            }
        }

        return prix;

    } catch (err) {
        console.warn('[commoditiesService] Erreur fetch :', err.message);
        return {};
    }
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
            variation: 0, // CommodityPriceAPI ne fournit pas la variation sur le plan free
        }));

        // Ne mettre en cache que si au moins 1 prix reçu
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