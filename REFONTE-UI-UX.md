# Refonte UI/UX — Smart-Yield

> Document de référence de la refonte visuelle, basé sur les maquettes Figma
> « Maquette design » (`XYpsUWyseYXZyMrZmPvAWg`) comparées à l'application actuelle.
>
> **Date :** 2026-06-24 · **Stack :** Electron + Express + Twig + CSS/JS vanilla · **Fidélité :** fidèle mais adapté.

---

## 1. Règle d'arbitrage (fondatrice)

| Dimension | Source de vérité |
|---|---|
| Layout, espacements, hiérarchie, style des composants | 🎨 **Maquette Figma** |
| Champs, données, colonnes, actions, logique, conditions de rôle | ⚙️ **App actuelle (intouchable)** |
| Tokens (couleurs, typo, radius) | 🎨 = ⚙️ (déjà alignés) |

- Maquette montre un champ/colonne absent de l'app → **ignoré**.
- App a une feature absente de la maquette → **conservée** et stylisée dans l'esprit.
- **Aucune modification** des routes, contrôleurs, services, Prisma, ni des champs/conditions de rôle.
- Décision actée : on **garde les boutons d'action standards** (`.btn-outline` / `.btn-danger`), pas de mini-pills.

---

## 2. Le constat structurant

Les maquettes décrivent un **commerce générique** (produits, matières premières, `$`, `kg`, fournisseurs avec « NB commandes »…), alors que l'app est un **système de pilotage énergétique** (MWh, sources d'énergie, mix ENTSO-E temps réel, €/MWh, seuils en % du mix).

➡️ Par la règle d'arbitrage, **l'app gagne sur tous ces contenus**. La refonte consiste à **appliquer la finition visuelle des maquettes au contenu métier réel (énergie)** — la base visuelle (tokens, composants) est déjà la bonne.

---

## 3. Motifs visuels transversaux (niveau design system)

À traiter **une seule fois** dans la couche partagée ; tous les écrans en bénéficient.

| # | Motif | Écart | Fichier cible |
|---|---|---|---|
| 1 | En-tête de page (H1 + sous-ligne live) | Maquettes ont un grand titre par page (+ « ● TEMPS RÉEL ») ; l'app entre direct dans le contenu | `.page-header` (components.css) |
| 2 | Aération des tableaux | Maquettes = padding vertical généreux, filet fin | `th`/`td` (components.css) |
| 3 | Cartes | Radius plus marqué + padding plus généreux | `.card` |
| 4 | Titres de section | ~26–28px poids plus léger | `.card__title` |
| 5 | Inputs (login) | Trop arrondis (24px) → ~10px | `login.css` |
| 6 | Cartes d'alerte (énergie) | Plus saturées/contrastées, grille 2 colonnes | `energie.css` |
| 7 | Graphiques (reporting) | Ligne pointillée + gradient → barres pleines 2 séries | `reporting.js` |
| 8 | Calendrier en modale | Inline → modale large (`.modal-calendar` existe déjà) | `planification` |
| 9 | Modales formulaire | Labels UPPERCASE, grilles 2 colonnes, inputs sombres arrondis | `components.css` / `fournisseurs.css` |

---

## 4. Audit détaillé par écran

### 4.1 Connexion — `login.twig` / `login.css` — 🟢 faible
**Écarts visuels :** inputs moins arrondis (`--radius-xs` → `--radius-sm`) · liens bas de carte empilés verticalement · titre ~28px medium + plus d'air · espacement champs plus généreux · labels « Mail : » / « Mot de passe : » (optionnel).
**À préserver :** toggle afficher/masquer mot de passe · toasts flash · `autofocus`/`required` · liens « Espace employé » + « Pwd oublié ».

### 4.2 Dashboard — `home.twig` / `dashboard.css` + navbar — 🟢 faible
**Écarts visuels :** padding KPI légèrement plus généreux · sinon **~90% déjà conforme**.
**À préserver :** KPI MWh produits / MWh stockés / CA (≠ Produits/Production/Ventes de la maquette) · tableau « Sources d'énergie » (≠ « Produits ») · nav app (Dashboard/Planification/Énergie/Stock/Ventes/Reporting) · 🔔 notifications + badge rôle · salutation « Bonjour, {prénom} » → /profil · conditions de rôle (CA, Ventes, Reporting, bloc Employés).

### 4.3 Mes produits — `produits.twig` — 🟢 faible
**Écarts visuels :** quasi pixel-conforme · nettoyer styles inline (`<h3 style>` → `.modal__title`, `style="display:flex"` → classe).
**À préserver :** prix de vente en modale · actions masquées sauf SUPER_ADMIN/ADMIN · 3 statuts (ACTIF/INACTIF/EN_ATTENTE) · modales CRUD.

### 4.4 Mes Ventes — `ventes.twig` — 🟢 faible
**Écarts visuels :** déjà conforme à l'esprit.
**À préserver :** colonnes Source / Client / Prix (€/MWh) / Total € (≠ Numéro de commande/Statut de la maquette) · € (pas `$`) · bouton Supprimer conditionné SUPER_ADMIN + modal · modale « Nouvelle vente » + total estimé.

### 4.5 Détails commandes — `vente-detail.twig` — 🟢 faible
**Écarts visuels :** grossir le total final (`.facture-ligne--ttc` 18px → ~28px) · remplacer le `style=""` inline du header par une classe.
**À préserver :** « Coût de production » + « Prix de vente » (≠ Sous-total HT / TVA 20%) · réf `#id`, date, client, badge type source · unités MWh & €/MWh · bouton Supprimer SUPER_ADMIN + modal (restauration stock).

### 4.6 Mes Stock — `stock.twig` — 🟢 faible
**Écarts visuels :** respiration inter-cartes (~32–40px).
**À préserver :** modèle « stock d'énergie par source » (Source/Type/Stock MWh/Coût prod €/MWh/Valeur €) · table « Historique des achats » · € (pas `$`) · colonne « Ajuster » masquée si OPERATEUR · suppression achat SUPER_ADMIN · modales (total estimé live).

### 4.7 Gestion de profils — `profil.twig` — 🟢 faible
**Écarts visuels :** passer en **colonne unique centrée** (~500px) · ajouter bloc identité (avatar initiale + nom + badge rôle) · labels UPPERCASE.
**À préserver :** champs Raison sociale + SIRET (readonly) · toggles œil mot de passe · formulaire mot de passe 3 champs → POST `/reset-password` · toasts.

### 4.8 Configuration des seuils — onglet « Seuils » de `energie.twig` (`#tab-config`) — 🟢 faible
> Pas une page dédiée : 3ᵉ onglet de la page Énergie.
**Écarts visuels :** ajouter un titre de page · renommer la carte « Seuil par produit » · soigner le toggle Auto (visible/coloré).
**À préserver :** unité **%** (mix national, ≠ `$/unité`) · en-têtes « Seuil déclenchement » / « Seuil arrêt » (≠ Achat MP / Vente) · colonne Source · bouton Supprimer + modal · onglets englobants.

### 4.9 Planification — `planification.twig` / `planification.css` — 🟡 moyen
**Écarts visuels :** onglets sobres (texte + soulignement actif, retirer pills bordées) · titre de carte plus grand/léger · tableau aéré (padding +, filet sous `thead`) · **calendrier en modale large** (`.modal-calendar` existe, inutilisé) · jours en toutes lettres MAJ · events en barres bleues pleines · cellules plus hautes.
**À préserver :** onglet « Mix ENTSO-E » (KPIs + alertes) · colonnes MWh prévus/produits/Coût/Décl. AUTO·MANUEL · 4 statuts · boutons d'action conditionnés statut+rôle · modales Planifier/Terminer/Créer achat/Supprimer · calendrier dynamique (FullCalendar).

### 4.10 Mes Reporting — `reporting.twig` / `reporting.js` — 🟡 moyen
**Écarts visuels :** 2ᵉ série coûts `line` pointillée → **barres vertes pleines** · barres CA gradient → couleur unie · légende format maquette · encadré interne autour du graphe · hiérarchie cards besoins (gros chiffre en haut + sous-ligne) · barre de remplissage plus épaisse/pleine largeur.
**À préserver :** boutons Exporter CSV / PDF · métrique « Stock disponible » + « Seuil déclenchement : X% » · unité MWh (≠ « unités ») · logique couleur barre (vert ≥50 / jaune ≥20 / rouge) · périodes 7/30/90j · empty-state.
**Vue print (`reporting-print.twig`) :** hors maquette, purement fonctionnelle → inchangée.

### 4.11 Cours des MP — `energie.twig` / `energie.css` — 🟡 moyen
**Écarts visuels :** bloc titre + statut live (« ● TEMPS RÉEL ») en haut · seuils clés en cartes KPI (achat vert / vente rouge) · cartes d'alerte plus saturées en **grille 2 colonnes** + bouton-action pilule à droite · tableau de cours aéré (statut en libellé coloré) · radius/padding carte tableau.
**À préserver :** onglets Mix ENTSO-E / Sources / Seuils / Prix énergie · KPI mix temps réel + badge LIVE ENTSO-E · CRUD sources · toggle auto seuils · graphique prix · boutons standards + gating · €/MWh (≠ `$`).

---

## 5. Plan d'exécution

**Phase 0 — Fondations partagées** *(le plus rentable)*
Traiter les 9 motifs transversaux dans `base.css` / `components.css` (+ créer `.page-header`). Rapproche tous les écrans des maquettes d'un coup.

**Phase 1 — Écrans « faible effort »**
Login → Dashboard → Produits → Ventes → Détails commandes → Stock → Profils → Config seuils.

**Phase 2 — Écrans « moyen effort »**
Cours des MP (énergie) → Reporting (Chart.js) → Planification (calendrier en modale).

**Phase 3 — Annexes & responsive**
Pages auth secondaires (forgot/reset/setup, espace employé) · vue print reporting · passe responsive (1024 / 768px).

**Garde-fou permanent :** ne toucher qu'au HTML/CSS de présentation. Vérifier après chaque phase que `npm test` passe (non-régression fonctionnelle).

---

## 6. Suivi

| Phase | Statut | Détail |
|---|---|---|
| Phase 0 — Fondations | ✅ fait | `.page-header` créé · cartes 18px/28px · tableaux aérés (14–16px, filet allégé) · modales 18px · titres section 26px/500 |
| Phase 1 — Faible effort | ✅ fait | Login (inputs `radius-sm`, liens empilés) · Détails commandes (total 28px, `.detail-header`) · Profil (colonne unique, avatar+rôle) · Produits (`.row-actions` + titres modale `.modal__title`) · Ventes/Stock/Dashboard déjà conformes (héritent Phase 0) · Config seuils → traité avec Énergie en Phase 2 |
| Phase 2 — Moyen effort | ✅ fait | ✅ Énergie/Cours des MP (`.page-header` « Pilotage énergétique » + live · alertes en grille 2 col plus contrastées · variante `.alerte-card--achat` prête) — **« Configuration des seuils » NON renommé** (terme énergie correct) · **pas d'alerte achat fabriquée** · ✅ Reporting (2 séries en barres pleines CA bleu/Coûts vert, suppression gradient+ligne pointillée · légende pastilles pleines · barre besoins 6px) — métriques MWh/seuils/exports préservés · ✅ Planification (`.form-grid-2` partagée · styles inline → `.row-actions` · événements calendrier en barres bleues pleines) — **calendrier gardé inline** (meilleure UX + sizing FullCalendar non vérifiable en modale) ; **onglets gardés en pills** pour cohérence app |
| Phase 3 — Annexes & responsive | ⬜ à faire | auth secondaires (forgot/reset/setup, espace employé) · print reporting · passe responsive 1024/768 |

### Vérification
- Changements = HTML/CSS de présentation uniquement. **Aucune** route/contrôleur/service/Prisma/champ/condition de rôle touché.
- ⚠️ Capture auto impossible (Electron GUI ne tourne pas en mode headless dans l'environnement d'automatisation). **Vérification visuelle à faire manuellement** dans l'app (`npm run server` + `npm start`).
