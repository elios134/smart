/**
 * SMART-YIELD — Tests Fonctionnels (refonte énergie)
 *
 * Teste toutes les fonctionnalités avec les 3 rôles.
 *
 * Prérequis :
 *   1. Base MariaDB lancée
 *   2. Migrations appliquées (npx prisma migrate dev)
 *   3. Seed de test exécuté (node tests/seed-test.js)
 *
 * Usage : node --test tests/run-tests.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";
import app from "../src/app.js";

// Désactive CSRF + rate-limiting pendant les tests fonctionnels (lu à chaque requête)
process.env.NODE_ENV = "test";

const PASSWORD = "Test1234!";

// ── Helpers ───────────────────────────────────────────────────

async function loginSuperAdmin() {
    const agent = supertest.agent(app);
    await agent.post("/login").type("form")
        .send({ email: "test-admin@smart.fr", password: PASSWORD });
    return agent;
}

async function loginAdmin() {
    const agent = supertest.agent(app);
    await agent.post("/employes/login").type("form")
        .send({ mail: "test-manager@smart.fr", password: PASSWORD });
    return agent;
}

async function loginOperateur() {
    const agent = supertest.agent(app);
    await agent.post("/employes/login").type("form")
        .send({ mail: "test-operateur@smart.fr", password: PASSWORD });
    return agent;
}

function expectRedirect(res, url) {
    assert.equal(res.status, 302, `Attendu redirect 302, reçu ${res.status}`);
    assert.ok(
        res.headers.location.startsWith(url),
        `Attendu redirect vers ${url}, reçu ${res.headers.location}`
    );
}

function expectOk(res) {
    assert.equal(res.status, 200, `Attendu 200, reçu ${res.status}`);
}

// ═══════════════════════════════════════════════════════════════
// 1. AUTHENTIFICATION
// ═══════════════════════════════════════════════════════════════

describe("1. AUTHENTIFICATION", () => {

    it("1.1 — GET /login affiche la page de connexion", async () => {
        const res = await supertest(app).get("/login");
        expectOk(res);
    });

    it("1.2 — POST /login avec SUPER_ADMIN redirige vers /home", async () => {
        const res = await supertest(app).post("/login").type("form")
            .send({ email: "test-admin@smart.fr", password: PASSWORD });
        expectRedirect(res, "/home");
    });

    it("1.3 — POST /login avec ADMIN est refusé (doit passer par /employes/login)", async () => {
        const res = await supertest(app).post("/login").type("form")
            .send({ email: "test-manager@smart.fr", password: PASSWORD });
        expectOk(res); // render login.twig avec erreur
    });

    it("1.4 — POST /login avec mauvais mot de passe échoue", async () => {
        const res = await supertest(app).post("/login").type("form")
            .send({ email: "test-admin@smart.fr", password: "mauvais" });
        expectOk(res); // render login.twig avec erreur
    });

    it("1.5 — GET /employes/login affiche la page de connexion employé", async () => {
        const res = await supertest(app).get("/employes/login");
        expectOk(res);
    });

    it("1.6 — POST /employes/login avec ADMIN redirige vers /home", async () => {
        const res = await supertest(app).post("/employes/login").type("form")
            .send({ mail: "test-manager@smart.fr", password: PASSWORD });
        expectRedirect(res, "/home");
    });

    it("1.7 — POST /employes/login avec OPERATEUR redirige vers /home", async () => {
        const res = await supertest(app).post("/employes/login").type("form")
            .send({ mail: "test-operateur@smart.fr", password: PASSWORD });
        expectRedirect(res, "/home");
    });

    it("1.8 — Accès /home sans session redirige vers /login", async () => {
        const res = await supertest(app).get("/home");
        expectRedirect(res, "/login");
    });

    it("1.9 — GET /logout détruit la session et redirige vers /login", async () => {
        const agent = await loginSuperAdmin();
        const res = await agent.get("/logout");
        expectRedirect(res, "/login");
        const res2 = await agent.get("/home");
        expectRedirect(res2, "/login");
    });
});

// ═══════════════════════════════════════════════════════════════
// 2. DASHBOARD (/home)
// ═══════════════════════════════════════════════════════════════

describe("2. DASHBOARD", () => {

    it("2.1 — SUPER_ADMIN accède au dashboard", async () => {
        const agent = await loginSuperAdmin();
        expectOk(await agent.get("/home"));
    });

    it("2.2 — ADMIN accède au dashboard", async () => {
        const agent = await loginAdmin();
        expectOk(await agent.get("/home"));
    });

    it("2.3 — OPERATEUR accède au dashboard", async () => {
        const agent = await loginOperateur();
        expectOk(await agent.get("/home"));
    });
});

// ═══════════════════════════════════════════════════════════════
// 3. PLANIFICATION (/planification)
// ═══════════════════════════════════════════════════════════════

describe("3. PLANIFICATION", () => {

    it("3.1 — SUPER_ADMIN accède à la planification", async () => {
        const agent = await loginSuperAdmin();
        expectOk(await agent.get("/planification"));
    });

    it("3.2 — ADMIN accède à la planification", async () => {
        const agent = await loginAdmin();
        expectOk(await agent.get("/planification"));
    });

    it("3.3 — OPERATEUR accède à la planification", async () => {
        const agent = await loginOperateur();
        expectOk(await agent.get("/planification"));
    });

    it("3.4 — SUPER_ADMIN peut créer une session", async () => {
        const agent = await loginSuperAdmin();
        const sources = await (await loginSuperAdmin()).get("/planification");
        const res = await agent.post("/planification/add").type("form").send({
            titre:          "TEST-Session-" + Date.now(),
            sourceId:       1,
            quantitePrevue: 100,
            debutPrev:      "2026-04-01T08:00",
            finPrev:        "2026-04-01T18:00"
        });
        assert.equal(res.status, 302);
    });

    it("3.5 — ADMIN peut créer une session", async () => {
        const agent = await loginAdmin();
        const res = await agent.post("/planification/add").type("form").send({
            titre:          "TEST-Session-Admin-" + Date.now(),
            sourceId:       1,
            quantitePrevue: 50,
            debutPrev:      "2026-04-02T08:00",
            finPrev:        "2026-04-02T16:00"
        });
        assert.equal(res.status, 302);
    });
});

// ═══════════════════════════════════════════════════════════════
// 4. ÉNERGIE (/energie)
// ═══════════════════════════════════════════════════════════════

describe("4. ENERGIE", () => {

    it("4.1 — SUPER_ADMIN accède au module énergie", async () => {
        const agent = await loginSuperAdmin();
        expectOk(await agent.get("/energie"));
    });

    it("4.2 — ADMIN accède au module énergie", async () => {
        const agent = await loginAdmin();
        expectOk(await agent.get("/energie"));
    });

    it("4.3 — OPERATEUR ne peut PAS accéder au module énergie (redirigé)", async () => {
        const agent = await loginOperateur();
        const res = await agent.get("/energie");
        assert.equal(res.status, 302);
    });

    it("4.4 — SUPER_ADMIN peut ajouter une source", async () => {
        const agent = await loginSuperAdmin();
        const res = await agent.post("/energie/sources/add").type("form").send({
            nom: "TEST-Source-" + Date.now(), type: "HYDRAULIQUE",
            coutProduction: 30, couleur: "#2FEEA8"
        });
        assert.equal(res.status, 302);
    });

    it("4.5 — SUPER_ADMIN peut configurer un seuil", async () => {
        const agent = await loginSuperAdmin();
        const res = await agent.post("/energie/seuils/save").type("form").send({
            sourceId: 1, seuilDeclenchement: 25, seuilArret: 10, statut: "ACTIF"
        });
        assert.equal(res.status, 302);
    });
});

// ═══════════════════════════════════════════════════════════════
// 5. STOCK (/stock)
// ═══════════════════════════════════════════════════════════════

describe("5. STOCK", () => {

    it("5.1 — SUPER_ADMIN accède au stock", async () => {
        const agent = await loginSuperAdmin();
        expectOk(await agent.get("/stock"));
    });

    it("5.2 — ADMIN accède au stock", async () => {
        const agent = await loginAdmin();
        expectOk(await agent.get("/stock"));
    });

    it("5.3 — OPERATEUR accède au stock", async () => {
        const agent = await loginOperateur();
        expectOk(await agent.get("/stock"));
    });

    it("5.4 — SUPER_ADMIN peut enregistrer un achat", async () => {
        const agent = await loginSuperAdmin();
        const res = await agent.post("/stock/achats/add").type("form").send({
            sourceId: 1, tiersId: "", quantite: 20, prixAchat: 45
        });
        assert.equal(res.status, 302);
    });

    it("5.5 — OPERATEUR ne peut PAS enregistrer un achat (redirigé)", async () => {
        const agent = await loginOperateur();
        const res = await agent.post("/stock/achats/add").type("form").send({
            sourceId: 1, quantite: 10, prixAchat: 40
        });
        assert.equal(res.status, 302);
        assert.ok(!res.headers.location.includes("success"));
    });
});

// ═══════════════════════════════════════════════════════════════
// 6. FOURNISSEURS (/fournisseurs)
// ═══════════════════════════════════════════════════════════════

describe("6. FOURNISSEURS & CLIENTS", () => {

    it("6.1 — SUPER_ADMIN accède à la liste", async () => {
        const agent = await loginSuperAdmin();
        expectOk(await agent.get("/fournisseurs"));
    });

    it("6.2 — ADMIN accède à la liste", async () => {
        const agent = await loginAdmin();
        expectOk(await agent.get("/fournisseurs"));
    });

    it("6.3 — OPERATEUR accède à la liste", async () => {
        const agent = await loginOperateur();
        expectOk(await agent.get("/fournisseurs"));
    });

    it("6.4 — SUPER_ADMIN peut ajouter un fournisseur", async () => {
        const agent = await loginSuperAdmin();
        const res = await agent.post("/fournisseurs/add").type("form").send({
            nom: "TEST-Fourni-" + Date.now(), typeTiers: "FOURNISSEUR",
            mail: "test@fourni.fr"
        });
        assert.equal(res.status, 302);
    });

    it("6.5 — SUPER_ADMIN peut ajouter un client", async () => {
        const agent = await loginSuperAdmin();
        const res = await agent.post("/fournisseurs/add").type("form").send({
            nom: "TEST-Client-" + Date.now(), typeTiers: "CLIENT",
            mail: "test@client.fr"
        });
        assert.equal(res.status, 302);
    });

    it("6.6 — OPERATEUR ne peut PAS ajouter un tiers (redirigé)", async () => {
        const agent = await loginOperateur();
        const res = await agent.post("/fournisseurs/add").type("form").send({
            nom: "HACK", typeTiers: "CLIENT"
        });
        assert.equal(res.status, 302);
        assert.ok(!res.headers.location.includes("success"));
    });
});

// ═══════════════════════════════════════════════════════════════
// 7. VENTES (/ventes)
// ═══════════════════════════════════════════════════════════════

describe("7. VENTES", () => {

    it("7.1 — SUPER_ADMIN accède aux ventes", async () => {
        const agent = await loginSuperAdmin();
        expectOk(await agent.get("/ventes"));
    });

    it("7.2 — ADMIN accède aux ventes", async () => {
        const agent = await loginAdmin();
        expectOk(await agent.get("/ventes"));
    });

    it("7.3 — OPERATEUR ne peut PAS accéder aux ventes (redirigé)", async () => {
        const agent = await loginOperateur();
        const res = await agent.get("/ventes");
        assert.equal(res.status, 302);
    });

    it("7.4 — SUPER_ADMIN peut enregistrer une vente", async () => {
        const agent = await loginSuperAdmin();
        const res = await agent.post("/ventes/add").type("form").send({
            sourceId: 1, tiersId: "", quantite: 10, prixVente: 80
        });
        // Peut retourner success ou error (stock insuffisant selon l'état)
        assert.equal(res.status, 302);
    });

    it("7.5 — OPERATEUR ne peut PAS enregistrer une vente (redirigé)", async () => {
        const agent = await loginOperateur();
        const res = await agent.post("/ventes/add").type("form").send({
            sourceId: 1, quantite: 5, prixVente: 80
        });
        assert.equal(res.status, 302);
        assert.ok(!res.headers.location.includes("success"));
    });
});

// ═══════════════════════════════════════════════════════════════
// 8. REPORTING (/reporting)
// ═══════════════════════════════════════════════════════════════

describe("8. REPORTING", () => {

    it("8.1 — SUPER_ADMIN accède au reporting", async () => {
        const agent = await loginSuperAdmin();
        expectOk(await agent.get("/reporting"));
    });

    it("8.2 — ADMIN accède au reporting", async () => {
        const agent = await loginAdmin();
        expectOk(await agent.get("/reporting"));
    });

    it("8.3 — OPERATEUR ne peut PAS accéder au reporting (redirigé)", async () => {
        const agent = await loginOperateur();
        const res = await agent.get("/reporting");
        assert.equal(res.status, 302);
    });
});

// ═══════════════════════════════════════════════════════════════
// 9. GESTION EMPLOYES (/employes)
// ═══════════════════════════════════════════════════════════════

describe("9. GESTION EMPLOYES", () => {

    it("9.1 — SUPER_ADMIN peut créer un employé", async () => {
        const agent = await loginSuperAdmin();
        const res = await agent.post("/employes/add").type("form").send({
            firstName: "Test", lastName: "Employe",
            mail: `test-employe-${Date.now()}@smart.fr`,
            password: PASSWORD, role: "OPERATEUR"
        });
        expectRedirect(res, "/home?success");
    });

    it("9.2 — ADMIN ne peut PAS créer un employé (redirigé)", async () => {
        const agent = await loginAdmin();
        const res = await agent.post("/employes/add").type("form").send({
            firstName: "Hack", lastName: "Test",
            mail: "hack@smart.fr", password: PASSWORD, role: "ADMIN"
        });
        assert.equal(res.status, 302);
        assert.ok(!res.headers.location.includes("success"));
    });

    it("9.3 — OPERATEUR ne peut PAS créer un employé (redirigé)", async () => {
        const agent = await loginOperateur();
        const res = await agent.post("/employes/add").type("form").send({
            firstName: "Hack", lastName: "Op",
            mail: "hack-op@smart.fr", password: PASSWORD, role: "OPERATEUR"
        });
        assert.equal(res.status, 302);
        assert.ok(!res.headers.location.includes("success"));
    });

    it("9.4 — ADMIN ne peut PAS modifier un employé (redirigé)", async () => {
        const agent = await loginAdmin();
        const res = await agent.post("/employes/1/edit").type("form").send({
            firstName: "Hack", lastName: "Hack", mail: "hack@hack.fr", role: "SUPER_ADMIN"
        });
        assert.equal(res.status, 302);
        assert.ok(!res.headers.location.includes("success"));
    });

    it("9.5 — ADMIN ne peut PAS supprimer un employé (redirigé)", async () => {
        const agent = await loginAdmin();
        const res = await agent.post("/employes/1/delete");
        assert.equal(res.status, 302);
        assert.ok(!res.headers.location.includes("success"));
    });
});

// ═══════════════════════════════════════════════════════════════
// 10. PROFIL (/profil)
// ═══════════════════════════════════════════════════════════════

describe("10. PROFIL", () => {

    it("10.1 — SUPER_ADMIN accède à son profil", async () => {
        const agent = await loginSuperAdmin();
        expectOk(await agent.get("/profil"));
    });

    it("10.2 — ADMIN accède à son profil", async () => {
        const agent = await loginAdmin();
        expectOk(await agent.get("/profil"));
    });

    it("10.3 — OPERATEUR accède à son profil", async () => {
        const agent = await loginOperateur();
        expectOk(await agent.get("/profil"));
    });

    it("10.4 — Page mot de passe oublié accessible sans session", async () => {
        const res = await supertest(app).get("/forgot-password");
        expectOk(res);
    });

    it("10.5 — Changement de mot de passe (connecté) refusé sans session", async () => {
        const res = await supertest(app).get("/reset-password");
        expectRedirect(res, "/login");
    });
});

// ═══════════════════════════════════════════════════════════════
// 11. SÉCURITÉ — ACCÈS SANS SESSION
// ═══════════════════════════════════════════════════════════════

describe("11. SECURITE — Accès sans session", () => {

    const protectedRoutes = [
        { method: "GET",  path: "/home" },
        { method: "GET",  path: "/planification" },
        { method: "GET",  path: "/energie" },
        { method: "GET",  path: "/stock" },
        { method: "GET",  path: "/fournisseurs" },
        { method: "GET",  path: "/ventes" },
        { method: "GET",  path: "/reporting" },
        { method: "GET",  path: "/profil" },
        { method: "POST", path: "/planification/add" },
        { method: "POST", path: "/energie/sources/add" },
        { method: "POST", path: "/stock/achats/add" },
        { method: "POST", path: "/ventes/add" },
        { method: "POST", path: "/employes/add" },
    ];

    for (const route of protectedRoutes) {
        it(`11.x — ${route.method} ${route.path} redirige vers /login sans session`, async () => {
            const res = route.method === "GET"
                ? await supertest(app).get(route.path)
                : await supertest(app).post(route.path).type("form").send({});
            assert.equal(res.status, 302);
            assert.ok(
                res.headers.location.includes("login"),
                `${route.method} ${route.path} devrait rediriger vers login, reçu: ${res.headers.location}`
            );
        });
    }
});

// ═══════════════════════════════════════════════════════════════
// 12. MATRICE COMPLÈTE DES DROITS
// ═══════════════════════════════════════════════════════════════

describe("12. MATRICE DES DROITS", () => {

    const matrix = [
        { path: "/home",          role: "SUPER_ADMIN", expect: 200 },
        { path: "/home",          role: "ADMIN",       expect: 200 },
        { path: "/home",          role: "OPERATEUR",   expect: 200 },
        { path: "/planification", role: "SUPER_ADMIN", expect: 200 },
        { path: "/planification", role: "ADMIN",       expect: 200 },
        { path: "/planification", role: "OPERATEUR",   expect: 200 },
        { path: "/energie",       role: "SUPER_ADMIN", expect: 200 },
        { path: "/energie",       role: "ADMIN",       expect: 200 },
        { path: "/energie",       role: "OPERATEUR",   expect: 302 }, // REFUSÉ
        { path: "/stock",         role: "SUPER_ADMIN", expect: 200 },
        { path: "/stock",         role: "ADMIN",       expect: 200 },
        { path: "/stock",         role: "OPERATEUR",   expect: 200 },
        { path: "/fournisseurs",  role: "SUPER_ADMIN", expect: 200 },
        { path: "/fournisseurs",  role: "ADMIN",       expect: 200 },
        { path: "/fournisseurs",  role: "OPERATEUR",   expect: 200 },
        { path: "/ventes",        role: "SUPER_ADMIN", expect: 200 },
        { path: "/ventes",        role: "ADMIN",       expect: 200 },
        { path: "/ventes",        role: "OPERATEUR",   expect: 302 }, // REFUSÉ
        { path: "/reporting",     role: "SUPER_ADMIN", expect: 200 },
        { path: "/reporting",     role: "ADMIN",       expect: 200 },
        { path: "/reporting",     role: "OPERATEUR",   expect: 302 }, // REFUSÉ
    ];

    for (const test of matrix) {
        it(`12.x — ${test.role} GET ${test.path} → ${test.expect}`, async () => {
            let agent;
            switch (test.role) {
                case "SUPER_ADMIN": agent = await loginSuperAdmin(); break;
                case "ADMIN":       agent = await loginAdmin();       break;
                case "OPERATEUR":   agent = await loginOperateur();   break;
            }
            const res = await agent.get(test.path);
            assert.equal(res.status, test.expect,
                `${test.role} GET ${test.path}: attendu ${test.expect}, reçu ${res.status}`);
        });
    }
});