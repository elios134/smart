# 🧪 Smart-Yield — Tests Fonctionnels

## Vue d'ensemble

Suite de **52 tests** couvrant toutes les fonctionnalités de l'application :

| Module | Tests | Ce qui est vérifié |
|--------|-------|--------------------|
| Authentification | 9 | Login SUPER_ADMIN, ADMIN, OPERATEUR, mauvais MDP, logout, session |
| Dashboard | 3 | Accès par les 3 rôles |
| Produits | 7 | CRUD + restrictions OPERATEUR (pas d'edit/delete) |
| Stock | 6 | Accès + restrictions OPERATEUR (pas d'edit/delete stock) |
| Fournisseurs | 6 | CRUD + restrictions OPERATEUR (lecture seule) |
| Production | 6 | Accès + ajout par tous, suppression ADMIN+ uniquement |
| Ventes | 6 | ADMIN+ uniquement, OPERATEUR totalement bloqué |
| Reporting | 5 | ADMIN+ uniquement, OPERATEUR totalement bloqué |
| Gestion Employés | 5 | SUPER_ADMIN uniquement pour CRUD |
| Profil | 4 | Accès par les 3 rôles |
| Sécurité sans session | 13 | Toutes les routes protégées redirigent vers /login |
| Matrice des droits | 21 | Vérification croisée rôle × page |

---

## Prérequis

- Node.js 18+
- Base MariaDB lancée et accessible
- Fichier `.env` configuré
- Migrations Prisma appliquées

## Installation

```bash
npm install supertest --save-dev
```

## Exécution

### 1. Seed de test (créer les données)
```bash
node tests/seed-test.js
```

Crée :
- **SUPER_ADMIN** : `test-admin@smart.fr` / `Test1234!`
- **ADMIN** : `test-manager@smart.fr` / `Test1234!`
- **OPERATEUR** : `test-operateur@smart.fr` / `Test1234!`
- 1 fournisseur, 1 matière première, 1 produit, 1 production, 1 vente, 1 commande MP, 1 seuil

### 2. Lancer les tests
```bash
node --test tests/run-tests.js
```

### 3. Nettoyage (supprimer les données de test)
```bash
node tests/cleanup-test.js
```

### Raccourci (tout en un)
```bash
npm test
```
Exécute seed → tests → cleanup.

---

## Matrice des droits testée

| Route | SUPER_ADMIN | ADMIN | OPERATEUR |
|-------|:-----------:|:-----:|:---------:|
| GET /home | ✅ 200 | ✅ 200 | ✅ 200 |
| GET /produits | ✅ 200 | ✅ 200 | ✅ 200 |
| POST /produits/add | ✅ | ✅ | ✅ |
| POST /produits/:id/edit | ✅ | ✅ | ❌ 302 |
| POST /produits/:id/delete | ✅ | ✅ | ❌ 302 |
| GET /stock | ✅ 200 | ✅ 200 | ✅ 200 |
| POST /stock/produits/:id/edit | ✅ | ✅ | ❌ 302 |
| POST /stock/produits/:id/delete | ✅ | ✅ | ❌ 302 |
| GET /fournisseurs | ✅ 200 | ✅ 200 | ✅ 200 |
| POST /fournisseurs/add | ✅ | ✅ | ❌ 302 |
| POST /fournisseurs/:id/edit | ✅ | ✅ | ❌ 302 |
| GET /production | ✅ 200 | ✅ 200 | ✅ 200 |
| POST /production/add | ✅ | ✅ | ✅ |
| POST /production/:id/delete | ✅ | ✅ | ❌ 302 |
| GET /ventes | ✅ 200 | ✅ 200 | ❌ 302 |
| POST /ventes/add | ✅ | ✅ | ❌ 302 |
| GET /reporting | ✅ 200 | ✅ 200 | ❌ 302 |
| POST /employes/add | ✅ | ❌ 302 | ❌ 302 |
| POST /employes/:id/edit | ✅ | ❌ 302 | ❌ 302 |
| POST /employes/:id/delete | ✅ | ❌ 302 | ❌ 302 |
