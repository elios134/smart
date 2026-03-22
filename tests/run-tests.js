/**
 * SMART-YIELD — Tests Fonctionnels Complets
 * 
 * Teste toutes les fonctionnalités de l'application avec les 3 rôles.
 * 
 * Prérequis :
 *   1. Base MariaDB lancée
 *   2. Migrations appliquées (npx prisma migrate dev)
 *   3. Seed de test exécuté (node tests/seed-test.js)
 * 
 * Usage : node --test tests/run-tests.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";
import app from "../src/app.js";

const PASSWORD = "Test1234!";

// ─── Helpers ─────────────────────────────────────────────────

/** Login en tant que SUPER_ADMIN via /login et retourne un agent avec session */
async function loginSuperAdmin() {
  const agent = supertest.agent(app);
  await agent
    .post("/login")
    .type("form")
    .send({ email: "test-admin@smart.fr", password: PASSWORD });
  return agent;
}

/** Login en tant que ADMIN via /employes/login et retourne un agent avec session */
async function loginAdmin() {
  const agent = supertest.agent(app);
  await agent
    .post("/employes/login")
    .type("form")
    .send({ mail: "test-manager@smart.fr", password: PASSWORD });
  return agent;
}

/** Login en tant que OPERATEUR via /employes/login et retourne un agent avec session */
async function loginOperateur() {
  const agent = supertest.agent(app);
  await agent
    .post("/employes/login")
    .type("form")
    .send({ mail: "test-operateur@smart.fr", password: PASSWORD });
  return agent;
}

/** Vérifie une redirection (302) vers l'URL attendue */
function expectRedirect(res, url) {
  assert.equal(res.status, 302, `Attendu redirect 302, reçu ${res.status}`);
  assert.ok(
    res.headers.location.startsWith(url),
    `Attendu redirect vers ${url}, reçu ${res.headers.location}`
  );
}

/** Vérifie un accès OK (200) */
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
    const res = await supertest(app)
      .post("/login")
      .type("form")
      .send({ email: "test-admin@smart.fr", password: PASSWORD });
    expectRedirect(res, "/home");
  });

  it("1.3 — POST /login avec un ADMIN est refusé (doit passer par /employes/login)", async () => {
    const res = await supertest(app)
      .post("/login")
      .type("form")
      .send({ email: "test-manager@smart.fr", password: PASSWORD });
    // Doit rester sur /login avec erreur
    expectOk(res); // render login.twig avec erreur
  });

  it("1.4 — POST /login avec mauvais mot de passe échoue", async () => {
    const res = await supertest(app)
      .post("/login")
      .type("form")
      .send({ email: "test-admin@smart.fr", password: "mauvais" });
    expectOk(res); // render login.twig avec erreur
  });

  it("1.5 — GET /employes/login affiche la page de connexion employé", async () => {
    const res = await supertest(app).get("/employes/login");
    expectOk(res);
  });

  it("1.6 — POST /employes/login avec ADMIN redirige vers /home", async () => {
    const res = await supertest(app)
      .post("/employes/login")
      .type("form")
      .send({ mail: "test-manager@smart.fr", password: PASSWORD });
    expectRedirect(res, "/home");
  });

  it("1.7 — POST /employes/login avec OPERATEUR redirige vers /home", async () => {
    const res = await supertest(app)
      .post("/employes/login")
      .type("form")
      .send({ mail: "test-operateur@smart.fr", password: PASSWORD });
    expectRedirect(res, "/home");
  });

  it("1.8 — Accès /home sans session redirige vers /login", async () => {
    const res = await supertest(app).get("/home");
    expectRedirect(res, "/login");
  });

  it("1.9 — GET /logout détruit la session", async () => {
    const agent = await loginSuperAdmin();
    const res = await agent.get("/logout");
    expectRedirect(res, "/login");
    // Vérifier que /home est inaccessible après
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
    const res = await agent.get("/home");
    expectOk(res);
  });

  it("2.2 — ADMIN accède au dashboard", async () => {
    const agent = await loginAdmin();
    const res = await agent.get("/home");
    expectOk(res);
  });

  it("2.3 — OPERATEUR accède au dashboard", async () => {
    const agent = await loginOperateur();
    const res = await agent.get("/home");
    expectOk(res);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. PRODUITS (/produits)
// ═══════════════════════════════════════════════════════════════

describe("3. PRODUITS", () => {

  it("3.1 — SUPER_ADMIN accède à la liste des produits", async () => {
    const agent = await loginSuperAdmin();
    const res = await agent.get("/produits");
    expectOk(res);
  });

  it("3.2 — ADMIN accède à la liste des produits", async () => {
    const agent = await loginAdmin();
    const res = await agent.get("/produits");
    expectOk(res);
  });

  it("3.3 — OPERATEUR accède à la liste des produits", async () => {
    const agent = await loginOperateur();
    const res = await agent.get("/produits");
    expectOk(res);
  });

  it("3.4 — SUPER_ADMIN peut ajouter un produit", async () => {
    const agent = await loginSuperAdmin();
    const res = await agent
      .post("/produits/add")
      .type("form")
      .send({
        nom: "TEST-Produit-" + Date.now(),
        coutActuel: 10,
        seuilBas: 5,
        seuilHaut: 15,
        stock: 20,
        prixVente: 25,
        statut: "ACTIF",
      });
    expectRedirect(res, "/produits?success");
  });

  it("3.5 — OPERATEUR peut ajouter un produit", async () => {
    const agent = await loginOperateur();
    const res = await agent
      .post("/produits/add")
      .type("form")
      .send({
        nom: "TEST-Produit-Op-" + Date.now(),
        coutActuel: 8,
        seuilBas: 3,
        seuilHaut: 12,
        stock: 10,
        prixVente: 20,
        statut: "ACTIF",
      });
    expectRedirect(res, "/produits?success");
  });

  it("3.6 — OPERATEUR ne peut PAS modifier un produit (redirigé)", async () => {
    const agent = await loginOperateur();
    const res = await agent
      .post("/produits/1/edit")
      .type("form")
      .send({ nom: "HACK", coutActuel: 0, seuilBas: 0, seuilHaut: 0, stock: 0, prixVente: 0, statut: "ACTIF" });
    // Doit être redirigé (accès refusé)
    assert.equal(res.status, 302);
    assert.ok(
      res.headers.location.includes("error") || res.headers.location.includes("production"),
      "OPERATEUR devrait être redirigé avec erreur"
    );
  });

  it("3.7 — OPERATEUR ne peut PAS supprimer un produit (redirigé)", async () => {
    const agent = await loginOperateur();
    const res = await agent.post("/produits/1/delete");
    assert.equal(res.status, 302);
    assert.ok(
      res.headers.location.includes("error") || res.headers.location.includes("production"),
      "OPERATEUR devrait être redirigé avec erreur"
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. STOCK (/stock)
// ═══════════════════════════════════════════════════════════════

describe("4. STOCK", () => {

  it("4.1 — SUPER_ADMIN accède au stock", async () => {
    const agent = await loginSuperAdmin();
    const res = await agent.get("/stock");
    expectOk(res);
  });

  it("4.2 — ADMIN accède au stock", async () => {
    const agent = await loginAdmin();
    const res = await agent.get("/stock");
    expectOk(res);
  });

  it("4.3 — OPERATEUR accède au stock", async () => {
    const agent = await loginOperateur();
    const res = await agent.get("/stock");
    expectOk(res);
  });

  it("4.4 — OPERATEUR ne peut PAS modifier un stock produit (redirigé)", async () => {
    const agent = await loginOperateur();
    const res = await agent
      .post("/stock/produits/1/edit")
      .type("form")
      .send({ stockQuantite: 999 });
    assert.equal(res.status, 302);
    assert.ok(
      res.headers.location.includes("error") || res.headers.location.includes("production"),
      "OPERATEUR devrait être redirigé avec erreur"
    );
  });

  it("4.5 — OPERATEUR ne peut PAS supprimer un stock produit (redirigé)", async () => {
    const agent = await loginOperateur();
    const res = await agent.post("/stock/produits/1/delete");
    assert.equal(res.status, 302);
  });

  it("4.6 — OPERATEUR ne peut PAS supprimer une commande MP (redirigé)", async () => {
    const agent = await loginOperateur();
    const res = await agent.post("/stock/achats/1/delete");
    assert.equal(res.status, 302);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. FOURNISSEURS (/fournisseurs)
// ═══════════════════════════════════════════════════════════════

describe("5. FOURNISSEURS", () => {

  it("5.1 — SUPER_ADMIN accède aux fournisseurs", async () => {
    const agent = await loginSuperAdmin();
    const res = await agent.get("/fournisseurs");
    expectOk(res);
  });

  it("5.2 — ADMIN accède aux fournisseurs", async () => {
    const agent = await loginAdmin();
    const res = await agent.get("/fournisseurs");
    expectOk(res);
  });

  it("5.3 — OPERATEUR accède aux fournisseurs (consultation)", async () => {
    const agent = await loginOperateur();
    const res = await agent.get("/fournisseurs");
    expectOk(res);
  });

  it("5.4 — ADMIN peut ajouter un fournisseur", async () => {
    const agent = await loginAdmin();
    const res = await agent
      .post("/fournisseurs/add")
      .type("form")
      .send({
        nom: "TEST-Fournisseur-" + Date.now(),
        nomContact: "Test",
        email: `test-${Date.now()}@fournisseur.fr`,
        telephone: "0600000001",
        delaiLivraison: 3,
      });
    expectRedirect(res, "/fournisseurs?success");
  });

  it("5.5 — OPERATEUR ne peut PAS ajouter un fournisseur (redirigé)", async () => {
    const agent = await loginOperateur();
    const res = await agent
      .post("/fournisseurs/add")
      .type("form")
      .send({
        nom: "HACK-Fournisseur",
        nomContact: "Hack",
        email: "hack@test.fr",
        telephone: "0000000000",
      });
    assert.equal(res.status, 302);
    assert.ok(
      res.headers.location.includes("error") || res.headers.location.includes("production"),
      "OPERATEUR devrait être redirigé"
    );
  });

  it("5.6 — OPERATEUR ne peut PAS modifier un fournisseur (redirigé)", async () => {
    const agent = await loginOperateur();
    const res = await agent
      .post("/fournisseurs/1/edit")
      .type("form")
      .send({ nom: "HACK", nomContact: "", email: "hack@hack.fr", telephone: "" });
    assert.equal(res.status, 302);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. PRODUCTION (/production)
// ═══════════════════════════════════════════════════════════════

describe("6. PRODUCTION", () => {

  it("6.1 — SUPER_ADMIN accède à la production", async () => {
    const agent = await loginSuperAdmin();
    const res = await agent.get("/production");
    expectOk(res);
  });

  it("6.2 — ADMIN accède à la production", async () => {
    const agent = await loginAdmin();
    const res = await agent.get("/production");
    expectOk(res);
  });

  it("6.3 — OPERATEUR accède à la production", async () => {
    const agent = await loginOperateur();
    const res = await agent.get("/production");
    expectOk(res);
  });

  it("6.4 — SUPER_ADMIN peut ajouter une production", async () => {
    const agent = await loginSuperAdmin();
    const res = await agent
      .post("/production/add")
      .type("form")
      .send({
        nom: "TEST-Produit-Alpha",
        quantite: 5,
        coutFab: 75,
        debutFab: "2026-03-17",
        finFab: "2026-03-18",
        statut: "EN_ATTENTE",
      });
    expectRedirect(res, "/production?success");
  });

  it("6.5 — OPERATEUR peut ajouter une production", async () => {
    const agent = await loginOperateur();
    const res = await agent
      .post("/production/add")
      .type("form")
      .send({
        nom: "TEST-Produit-Alpha",
        quantite: 2,
        coutFab: 30,
        debutFab: "2026-03-17",
        finFab: "2026-03-18",
        statut: "EN_ATTENTE",
      });
    expectRedirect(res, "/production?success");
  });

  it("6.6 — OPERATEUR ne peut PAS supprimer une production (redirigé)", async () => {
    const agent = await loginOperateur();
    const res = await agent.post("/production/1/delete");
    assert.equal(res.status, 302);
    assert.ok(
      res.headers.location.includes("error") || res.headers.location.includes("production"),
      "OPERATEUR devrait être redirigé"
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. VENTES (/ventes) — ADMIN+ uniquement
// ═══════════════════════════════════════════════════════════════

describe("7. VENTES", () => {

  it("7.1 — SUPER_ADMIN accède aux ventes", async () => {
    const agent = await loginSuperAdmin();
    const res = await agent.get("/ventes");
    expectOk(res);
  });

  it("7.2 — ADMIN accède aux ventes", async () => {
    const agent = await loginAdmin();
    const res = await agent.get("/ventes");
    expectOk(res);
  });

  it("7.3 — OPERATEUR ne peut PAS accéder aux ventes (redirigé)", async () => {
    const agent = await loginOperateur();
    const res = await agent.get("/ventes");
    assert.equal(res.status, 302);
    assert.ok(
      res.headers.location.includes("error") || res.headers.location.includes("production"),
      "OPERATEUR devrait être redirigé avec erreur"
    );
  });

  it("7.4 — OPERATEUR ne peut PAS créer une vente (redirigé)", async () => {
    const agent = await loginOperateur();
    const res = await agent
      .post("/ventes/add")
      .type("form")
      .send({ produitId: 1, quantite: 1 });
    assert.equal(res.status, 302);
    assert.ok(
      res.headers.location.includes("error") || res.headers.location.includes("production"),
      "OPERATEUR devrait être redirigé"
    );
  });

  it("7.5 — OPERATEUR ne peut PAS voir le détail d'une vente (redirigé)", async () => {
    const agent = await loginOperateur();
    const res = await agent.get("/ventes/1");
    assert.equal(res.status, 302);
  });

  it("7.6 — OPERATEUR ne peut PAS supprimer une vente (redirigé)", async () => {
    const agent = await loginOperateur();
    const res = await agent.post("/ventes/1/delete");
    assert.equal(res.status, 302);
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. REPORTING (/reporting) — ADMIN+ uniquement
// ═══════════════════════════════════════════════════════════════

describe("8. REPORTING", () => {

  it("8.1 — SUPER_ADMIN accède au reporting", async () => {
    const agent = await loginSuperAdmin();
    const res = await agent.get("/reporting");
    expectOk(res);
  });

  it("8.2 — ADMIN accède au reporting", async () => {
    const agent = await loginAdmin();
    const res = await agent.get("/reporting");
    expectOk(res);
  });

  it("8.3 — OPERATEUR ne peut PAS accéder au reporting (redirigé)", async () => {
    const agent = await loginOperateur();
    const res = await agent.get("/reporting");
    assert.equal(res.status, 302);
    assert.ok(
      res.headers.location.includes("error") || res.headers.location.includes("production"),
      "OPERATEUR devrait être redirigé"
    );
  });

  it("8.4 — OPERATEUR ne peut PAS ajouter un seuil (redirigé)", async () => {
    const agent = await loginOperateur();
    const res = await agent
      .post("/reporting/seuils/add")
      .type("form")
      .send({ matiereId: 1, seuilAchat: 50, seuilVente: 200 });
    assert.equal(res.status, 302);
  });

  it("8.5 — OPERATEUR ne peut PAS supprimer un seuil (redirigé)", async () => {
    const agent = await loginOperateur();
    const res = await agent.post("/reporting/seuils/1/delete");
    assert.equal(res.status, 302);
  });
});

// ═══════════════════════════════════════════════════════════════
// 9. GESTION EMPLOYES (/employes) — SUPER_ADMIN uniquement
// ═══════════════════════════════════════════════════════════════

describe("9. GESTION EMPLOYES", () => {

  let createdEmployeId = null;

  it("9.1 — SUPER_ADMIN peut créer un employé", async () => {
    const agent = await loginSuperAdmin();
    const res = await agent
      .post("/employes/add")
      .type("form")
      .send({
        firstName: "Test",
        lastName: "Employe",
        mail: `test-employe-${Date.now()}@smart.fr`,
        password: PASSWORD,
        role: "OPERATEUR",
      });
    expectRedirect(res, "/home?success");
  });

  it("9.2 — ADMIN ne peut PAS créer un employé (redirigé)", async () => {
    const agent = await loginAdmin();
    const res = await agent
      .post("/employes/add")
      .type("form")
      .send({
        firstName: "Hack",
        lastName: "Employe",
        mail: "hack-employe@smart.fr",
        password: PASSWORD,
        role: "ADMIN",
      });
    assert.equal(res.status, 302);
    assert.ok(
      !res.headers.location.includes("success"),
      "ADMIN ne devrait pas pouvoir créer un employé"
    );
  });

  it("9.3 — OPERATEUR ne peut PAS créer un employé (redirigé)", async () => {
    const agent = await loginOperateur();
    const res = await agent
      .post("/employes/add")
      .type("form")
      .send({
        firstName: "Hack",
        lastName: "Employe",
        mail: "hack-op@smart.fr",
        password: PASSWORD,
        role: "OPERATEUR",
      });
    assert.equal(res.status, 302);
    assert.ok(
      !res.headers.location.includes("success"),
      "OPERATEUR ne devrait pas pouvoir créer un employé"
    );
  });

  it("9.4 — ADMIN ne peut PAS modifier un employé (redirigé)", async () => {
    const agent = await loginAdmin();
    const res = await agent
      .post("/employes/1/edit")
      .type("form")
      .send({ firstName: "Hack", lastName: "Hack", mail: "hack@hack.fr", role: "SUPER_ADMIN" });
    assert.equal(res.status, 302);
    assert.ok(
      !res.headers.location.includes("success"),
      "ADMIN ne devrait pas pouvoir modifier un employé"
    );
  });

  it("9.5 — ADMIN ne peut PAS supprimer un employé (redirigé)", async () => {
    const agent = await loginAdmin();
    const res = await agent.post("/employes/1/delete");
    assert.equal(res.status, 302);
    assert.ok(
      !res.headers.location.includes("success"),
      "ADMIN ne devrait pas pouvoir supprimer un employé"
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// 10. PROFIL
// ═══════════════════════════════════════════════════════════════

describe("10. PROFIL", () => {

  it("10.1 — SUPER_ADMIN accède à son profil", async () => {
    const agent = await loginSuperAdmin();
    const res = await agent.get("/profil");
    expectOk(res);
  });

  it("10.2 — ADMIN accède à son profil", async () => {
    const agent = await loginAdmin();
    const res = await agent.get("/profil");
    expectOk(res);
  });

  it("10.3 — OPERATEUR accède à son profil", async () => {
    const agent = await loginOperateur();
    const res = await agent.get("/profil");
    expectOk(res);
  });

  it("10.4 — SUPER_ADMIN accède à la page de reset password", async () => {
    const agent = await loginSuperAdmin();
    const res = await agent.get("/reset-password");
    expectOk(res);
  });
});

// ═══════════════════════════════════════════════════════════════
// 11. SÉCURITÉ — ACCÈS SANS SESSION
// ═══════════════════════════════════════════════════════════════

describe("11. SECURITE — Accès sans session", () => {

  const protectedRoutes = [
    { method: "GET",  path: "/home" },
    { method: "GET",  path: "/produits" },
    { method: "GET",  path: "/stock" },
    { method: "GET",  path: "/fournisseurs" },
    { method: "GET",  path: "/production" },
    { method: "GET",  path: "/ventes" },
    { method: "GET",  path: "/reporting" },
    { method: "GET",  path: "/profil" },
    { method: "POST", path: "/produits/add" },
    { method: "POST", path: "/ventes/add" },
    { method: "POST", path: "/employes/add" },
    { method: "POST", path: "/production/add" },
    { method: "POST", path: "/reporting/seuils/add" },
  ];

  for (const route of protectedRoutes) {
    it(`11.x — ${route.method} ${route.path} redirige vers /login sans session`, async () => {
      let res;
      if (route.method === "GET") {
        res = await supertest(app).get(route.path);
      } else {
        res = await supertest(app).post(route.path).type("form").send({});
      }
      assert.equal(res.status, 302, `${route.method} ${route.path} devrait redirect`);
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

describe("12. MATRICE DES DROITS — Vérification croisée", () => {

  const matrix = [
    // [route, method, role, attendu]
    // GET pages
    { path: "/home",         method: "GET",  role: "SUPER_ADMIN", expect: 200 },
    { path: "/home",         method: "GET",  role: "ADMIN",       expect: 200 },
    { path: "/home",         method: "GET",  role: "OPERATEUR",   expect: 200 },
    { path: "/produits",     method: "GET",  role: "SUPER_ADMIN", expect: 200 },
    { path: "/produits",     method: "GET",  role: "ADMIN",       expect: 200 },
    { path: "/produits",     method: "GET",  role: "OPERATEUR",   expect: 200 },
    { path: "/stock",        method: "GET",  role: "SUPER_ADMIN", expect: 200 },
    { path: "/stock",        method: "GET",  role: "ADMIN",       expect: 200 },
    { path: "/stock",        method: "GET",  role: "OPERATEUR",   expect: 200 },
    { path: "/fournisseurs", method: "GET",  role: "SUPER_ADMIN", expect: 200 },
    { path: "/fournisseurs", method: "GET",  role: "ADMIN",       expect: 200 },
    { path: "/fournisseurs", method: "GET",  role: "OPERATEUR",   expect: 200 },
    { path: "/production",   method: "GET",  role: "SUPER_ADMIN", expect: 200 },
    { path: "/production",   method: "GET",  role: "ADMIN",       expect: 200 },
    { path: "/production",   method: "GET",  role: "OPERATEUR",   expect: 200 },
    { path: "/ventes",       method: "GET",  role: "SUPER_ADMIN", expect: 200 },
    { path: "/ventes",       method: "GET",  role: "ADMIN",       expect: 200 },
    { path: "/ventes",       method: "GET",  role: "OPERATEUR",   expect: 302 }, // REFUSÉ
    { path: "/reporting",    method: "GET",  role: "SUPER_ADMIN", expect: 200 },
    { path: "/reporting",    method: "GET",  role: "ADMIN",       expect: 200 },
    { path: "/reporting",    method: "GET",  role: "OPERATEUR",   expect: 302 }, // REFUSÉ
  ];

  for (const test of matrix) {
    it(`12.x — ${test.role} ${test.method} ${test.path} → ${test.expect}`, async () => {
      let agent;
      switch (test.role) {
        case "SUPER_ADMIN": agent = await loginSuperAdmin(); break;
        case "ADMIN":       agent = await loginAdmin(); break;
        case "OPERATEUR":   agent = await loginOperateur(); break;
      }

      const res = await agent.get(test.path);
      assert.equal(
        res.status,
        test.expect,
        `${test.role} ${test.method} ${test.path}: attendu ${test.expect}, reçu ${res.status}`
      );
    });
  }
});
