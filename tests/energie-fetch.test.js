/**
 * SMART-YIELD — Tests unitaires de la récupération du mix énergétique
 *
 * Vérifie la robustesse de getMixEnergetique() face à l'API ENTSO-E intermittente :
 *   1. Retry        : un échec réseau passager n'empêche pas de récupérer le mix.
 *   2. Anti-rafale  : des appels simultanés ne déclenchent qu'UN seul appel réseau.
 *
 * On mocke global.fetch → aucun réseau ni base de données requis.
 * Chaque test importe une instance FRAÎCHE du module (query string) pour repartir
 * d'un cache vide.
 *
 * Usage : node --test tests/energie-fetch.test.js
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

// Clé bidon + 2 tentatives ; le timeout n'a aucun effet ici (fetch est mocké).
process.env.ENTSOE_API_KEY = "test-token";
process.env.ENTSOE_RETRIES = "2";
process.env.NODE_ENV = "test";

// XML minimal valide : une série solaire (B16) avec un point à 100 MW.
const XML_OK =
    "<GL_MarketDocument><TimeSeries><MktPSRType><psrType>B16</psrType></MktPSRType>" +
    "<Period><Point><quantity>100</quantity></Point></Period></TimeSeries></GL_MarketDocument>";

const okResponse = () => ({ ok: true, text: async () => XML_OK });

// Importe une instance neuve du service (cache vide) à chaque test.
let counter = 0;
function freshService() {
    return import(`../src/services/energieService.js?fresh=${counter++}`);
}

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

describe("getMixEnergetique — robustesse réseau", () => {
    it("réessaie après un échec réseau passager et finit par récupérer le mix", async () => {
        let calls = 0;
        global.fetch = async () => {
            calls++;
            if (calls === 1) throw new Error("The operation was aborted due to timeout");
            return okResponse();
        };
        const { getMixEnergetique } = await freshService();

        const mix = await getMixEnergetique();
        assert.equal(calls, 2, "doit avoir réessayé une fois (2 appels)");
        assert.equal(mix.SOLAIRE, 100, "le mix doit être récupéré à la 2e tentative");
    });

    it("coalesce les appels simultanés en UN seul appel réseau (anti-rafale)", async () => {
        let calls = 0;
        global.fetch = async () => {
            calls++;
            await new Promise((r) => setTimeout(r, 20)); // simule la latence réseau
            return okResponse();
        };
        const { getMixEnergetique } = await freshService();

        const [a, b] = await Promise.all([getMixEnergetique(), getMixEnergetique()]);
        assert.equal(calls, 1, "deux appels simultanés ne doivent déclencher qu'un fetch");
        assert.equal(a.SOLAIRE, 100);
        assert.deepEqual(a, b, "les deux appelants reçoivent le même résultat");
    });

    it("abandonne proprement (null) si toutes les tentatives échouent et qu'aucun cache n'existe", async () => {
        let calls = 0;
        global.fetch = async () => {
            calls++;
            throw new Error("The operation was aborted due to timeout");
        };
        const { getMixEnergetique } = await freshService();

        const mix = await getMixEnergetique();
        assert.equal(calls, 2, "doit épuiser les 2 tentatives");
        assert.equal(mix, null, "sans cache, un échec total renvoie null (dégradation propre)");
    });
});
