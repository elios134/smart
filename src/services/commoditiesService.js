/**
 * SMART-YIELD — Service Cours Matières Premières
 * 
 * API : API Ninjas (https://api-ninjas.com/api/commodityprice)
 * Plan : Gratuit à vie — sans carte bancaire — pas d'expiration
 * Limite free : 7 matières/semaine en rotation + 10 000 req/mois
 * 
 * Clé .env : COMMODITY_API_KEY=ta_cle_api_ninjas
 * Inscription : https://api-ninjas.com (gratuit)
 * 
 * Cache : 1h in-memory → ~360 req/mois max
 */

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h

// ── Mapping matières → noms API Ninjas ──────────────────────
export const COMMODITES = [
    { apiName: 'gold',             nom: 'Or',            unite: 'T.oz',   categorie: 'Métaux précieux' },
    { apiName: 'silver',           nom: 'Argent',        unite: 'T.oz',   categorie: 'Métaux précieux' },
    { apiName: 'platinum',         nom: 'Platine',       unite: 'T.oz',   categorie: 'Métaux précieux' },
    { apiName: 'palladium',        nom: 'Palladium',     unite: 'T.oz',   categorie: 'Métaux précieux' },
    { apiName: 'copper',           nom: 'Cuivre',        unite: 'Lb',     categorie: 'Métaux' },
    { apiName: 'crude_oil',        nom: 'Pétrole WTI',   unite: 'Bbl',    categorie: 'Énergie' },
    { apiName: 'brent_crude_oil',  nom: 'Pétrole Brent', unite: 'Bbl',    categorie: 'Énergie' },
    { apiName: 'natural_gas',      nom: 'Gaz naturel',   unite: 'MMBtu',  categorie: 'Énergie' },
    { apiName: 'corn',             nom: 'Maïs',          unite: 'Bushel', categorie: 'Agricole' },
    { apiName: 'coffee',           nom: 'Café',          unite: 'Lb',     categorie: 'Agricole' },
    { apiName: 'cocoa',            nom: 'Cacao',         unite: 'T',      categorie: 'Agricole' },
    { apiName: 'sugar',            nom: 'Sucre',         unite: 'Lb',     categorie: 'Agricole' },
];

// ── Cache ─────────────────────────────────────────────────────
const cache = { data: null, fetchedAt: 0 };

function isCacheValid() {
    return cache.data && (Date.now() - cache.fetchedAt) < CACHE_TTL_MS;
}

// ── Fetch un seul cours ──────────────────────────────────────
async function fetchSinglePrice(apiName, apiKey) {
    try {
        const url = `https://api.api-ninjas.com/v1/commodityprice?name=${apiName}`;
        const res = await fetch(url, {
            headers: { 'X-Api-Key': apiKey },
            signal: AbortSignal.timeout(6000),
        });

        if (!res.ok) {
            // 403 = matière pas dispo cette semaine (rotation free tier)
            if (res.status === 403) return null;
            console.warn(`[commoditiesService] ${apiName} → HTTP ${res.status}`);
            return null;
        }

        const json = await res.json();
        // Réponse : { exchange: "CME", name: "Gold Futures", price: 3400.12, updated: 1703866777 }
        if (json.price !== undefined && json.price !== null) {
            return Math.round(json.price * 100) / 100;
        }
        return null;
    } catch (err) {
        console.warn(`[commoditiesService] ${apiName} erreur:`, err.message);
        return null;
    }
}

// ── Fetch toutes les matières (en parallèle) ─────────────────
async function fetchPrixMarche() {
    const apiKey = process.env.COMMODITY_API_KEY;
    if (!apiKey) {
        console.warn('[commoditiesService] COMMODITY_API_KEY manquant dans .env');
        return {};
    }

    const prix = {};

    const results = await Promise.allSettled(
        COMMODITES.map(async (c) => {
            const price = await fetchSinglePrice(c.apiName, apiKey);
            return { apiName: c.apiName, price };
        })
    );

    for (const result of results) {
        if (result.status === 'fulfilled' && result.value.price !== null) {
            prix[result.value.apiName] = result.value.price;
        }
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
            variation: 0, // API Ninjas ne fournit pas la variation
        }));

        // Ne mettre en cache que si au moins 1 prix reçu
        if (result.some(r => r.isLive)) {
            cache.data      = result;
            cache.fetchedAt = Date.now();
        }

        return result;

    } catch (err) {
        console.error('[commoditiesService] Erreur fetch :', err.message);
        return COMMODITES.map(c => ({
            symbole: c.apiName, nom: c.nom, unite: c.unite,
            categorie: c.categorie, prix: null, isLive: false, variation: 0,
        }));
    }
}
