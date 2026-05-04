# 🧪 Smart-Yield — Tests Fonctionnels

## Vue d'ensemble

Suite de **52 tests** couvrant les fonctionnalités principales de l'application :

| Module | Tests | Ce qui est vérifié |
|--------|-------|--------------------|
| Authentification | 9 | Login SUPER_ADMIN, ADMIN, OPERATEUR, mauvais MDP, logout, session |
| Dashboard | 3 | Accès par les 3 rôles |
| Planification | 5 | Accès par rôle + création de session |
| Énergie | 5 | Accès par rôle + création source + seuil |
| Stock | 6 | Accès + restrictions OPERATEUR (pas d'edit/delete stock) |
| Fournisseurs | 6 | CRUD + restrictions OPERATEUR (lecture seule) |
| Ventes | 6 | ADMIN+ uniquement, OPERATEUR totalement bloqué |
| Reporting | 3 | ADMIN+ uniquement, OPERATEUR totalement bloqué |
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
- 1 fournisseur/client de test, des sources énergie, des sessions de planification, des stocks et des ventes de test

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
| GET /planification | ✅ 200 | ✅ 200 | ✅ 200 |
| POST /planification/add | ✅ | ✅ | ✅ |
| GET /energie | ✅ 200 | ✅ 200 | ❌ 302 |
| POST /energie/sources/add | ✅ | ❌ 302 | ❌ 302 |
| GET /stock | ✅ 200 | ✅ 200 | ✅ 200 |
| POST /stock/achats/add | ✅ | ✅ | ❌ 302 |
| GET /fournisseurs | ✅ 200 | ✅ 200 | ✅ 200 |
| POST /fournisseurs/add | ✅ | ✅ | ❌ 302 |
| GET /ventes | ✅ 200 | ✅ 200 | ❌ 302 |
| POST /ventes/add | ✅ | ✅ | ❌ 302 |
| GET /reporting | ✅ 200 | ✅ 200 | ❌ 302 |
| POST /employes/add | ✅ | ❌ 302 | ❌ 302 |
| POST /employes/:id/edit | ✅ | ❌ 302 | ❌ 302 |
| POST /employes/:id/delete | ✅ | ❌ 302 | ❌ 302 |
