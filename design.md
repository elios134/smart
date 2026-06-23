# Smart-Yield — Spécifications du Système de Design (Version Enrichie)

Ce document regroupe les tokens, les directives visuelles et les comportements interactifs du système **Smart-Yield** pour guider l'implémentation (Dark Mode industriel).

---

## 1. Fondations Visuelles (Tokens)

### Couleurs (Mode Sombre)
| Catégorie | Token | Valeur HEX | Usage |
| :--- | :--- | :--- | :--- |
| **Fond** | `surface-lowest` | `#0C0E15` | Fond global de l'application |
| **Surface** | `surface` | `#161B2E` | Cartes, conteneurs principaux |
| **Surface (Highlight)** | `surface-bright`| `#373941` | Éléments interactifs secondaires |
| **Bordure** | `outline` | `#252D45` | Bordures de cartes et séparateurs |
| **Primaire** | `primary` | `#4F8AFF` | Boutons CTA, liens, états actifs |
| **Succès** | `success` | `#2FEEA8` | Indicateurs positifs, statuts opérationnels |
| **Danger** | `error` | `#FF4F6B` | Alertes critiques, actions destructives |
| **Texte (On-Surface)**| `on-surface` | `#E2E6F0` | Texte principal |
| **Texte (Muted)** | `on-surface-variant`| `#5A6380` | Labels, texte secondaire |

### Typographie
- **Famille** : `Manrope`, sans-serif.
- **Échelle** :
  - **H1 (Display)** : 32px / Bold / Spacing -0.02em.
  - **H2 (Section)** : 24px / Semi-Bold.
  - **Body (Base)** : 14px / Regular / Interligne 1.5.
  - **Label (Caption)**: 11px / Bold / Uppercase / Spacing 0.05em.

---

## 2. États Interactifs (Comportements)

| Élément | État | Style / Transition |
| :--- | :--- | :--- |
| **Boutons Primaires** | `Default` | Fond `primary` (opacité 10%), bordure 1px `primary`, texte `primary`. |
| | `Hover` | Fond `primary` (opacité 100%), texte `#FFFFFF`. Transition 200ms. |
| | `Active` | Scale 0.98. |
| **Tableaux** | `Row Hover` | Fond `#1C2237`. Curseur pointeur si ligne cliquable. |
| **Inputs** | `Focus` | Bordure `primary`, outline 0. Lueur subtile (glow) de 2px `primary` (alpha 0.2). |
| **Pills Nav** | `Active` | Fond `primary` (opacité 100%), texte blanc. |

---

## 3. Logique des Graphiques & Data-Viz

### Bibliothèques recommandées : ApexCharts ou Chart.js.

- **Flux de Production/Consommation** (Area/Bar) :
  - Production : Gradient `primary` -> transparent.
  - Consommation : Ligne `success` pointillée ou pleine fine.
- **Indicateurs de Stock** (Radial Bar / Gauge) :
  - 0-20% : `error`
  - 20-50% : Jaune `#FFB34F`
  - 50-100% : `success`
- **Axes & Grilles** : Lignes de grille en `#252D45`. Pas de lignes verticales. Labels en `on-surface-variant` (10px).

---

## 4. Comportement Responsive & Grille

- **Grid System** : Base 8px. Gaps de 16px ou 24px entre les cartes.
- **Mobile (< 768px)** :
  - **Navbar** : Devient un menu "Bottom Sheet" ou "Sticky Top" avec défilement horizontal des catégories.
  - **Stats Cards** : Passage de 4 colonnes à 1 colonne (empilement vertical).
  - **Tableaux** : Masquer les colonnes secondaires (ID, Type) ; n'afficher que l'essentiel (Nom, Valeur, Statut). Activer le scroll horizontal (`overflow-x-auto`).
  - **Modales** : Utiliser un rayon de bordure supérieur uniquement (`radius-large` en haut) pour simuler une feuille ancrée en bas.

---

## 5. Instructions pour Cursor

1. **Dark UI stricte** : Ne pas utiliser de blancs purs pour le texte (privilégier `#E2E6F0`).
2. **Effets de Profondeur** : Préférer les bordures de 1px (`outline`) aux ombres portées pour le look industriel.
3. **Optimisation** : Utiliser des CSS Variables (`--color-primary`, etc.) pour permettre un changement de thème rapide.
4. **Accessibilité** : Assurer un ratio de contraste suffisant entre `on-surface` et `surface`.

---

## 6. Inventaire des composants (référence code)

Liste des **motifs UI déjà présents** dans l’app (Twig + CSS), pour compléter les sections 1–5 et éviter les oublis à l’implémentation ou dans les maquettes. Les noms entre **backticks** sont des classes CSS.

### 6.1 Chrome & navigation

| Composant | Classes / fichiers | Notes |
| :--- | :--- | :--- |
| Barre principale | `.navbar`, `.navbar__links`, `.navbar__right` | `navbar.css` — sticky, 64px. |
| Lien profil + salutation | `.nav-profil`, `.navbar__greeting` | Pas de logo seul ; texte « Bonjour, … ». |
| Liens section (pills) | `.nav-btn`, `.nav-btn.active` | Dashboard, Planif., Énergie, Stock, Ventes, Reporting. |
| Déconnexion | `.navbar__logout` | Style danger / distinct des pills. |
| Rôle utilisateur | `.badge`, `.badge-muted` | Ex. ADMIN, à droite avant les actions. |
| Notifications | `.notif-bell`, `.notif-badge`, `.notif-panel`, `.notif-panel__header`, `.notif-list`, `.notif-item`, `.notif-empty`, `.notif-clear-btn` | Panneau déroulant ; liste scrollable. |

### 6.2 Feedback & dialogue

| Composant | Classes / fichiers | Notes |
| :--- | :--- | :--- |
| Toasts | `.toast-container`, `.toast`, `.toast-success`, `.toast-error` | Flash succès / erreur ; coin sup. droit possible. |
| Fond modale | `.modal-backdrop`, `.modal-backdrop.open` | Backdrop sombre + flou (`backdrop-filter`). |
| Fenêtre modale | `.modal`, `.modal__title`, `.modal__confirm-text` | Formulaires CRUD, confirmations. |
| Grille 2 col. (modale) | `.modal-grid-2` | `fournisseurs.css` — responsive → 1 col. |

### 6.3 Boutons

| Variante | Classes | Usage typique |
| :--- | :--- | :--- |
| Primaire | `.btn`, `.btn-primary` | CTA principal. |
| Contour (secondaire) | `.btn-outline` | Modifier, Détails. |
| Danger | `.btn-danger` | Supprimer. |
| Fantôme | `.btn-ghost` | Actions discrètes. |
| Pleine largeur | `.btn-full` | Login, actions empilées. |

### 6.4 Formulaires

| Composant | Classes | Notes |
| :--- | :--- | :--- |
| Groupe | `.form-group`, `.form-label` | Label caption uppercase (hors login). |
| Champs | `.form-input`, `.form-select` | Select avec chevron SVG intégré. |
| Actions | `.form-actions` | Boutons empilés en modale. |
| Mot de passe | `.input-password-wrap`, `.btn-toggle` | Afficher / masquer le mot de passe. |
| Ligne délai + unité | `.delai-row`, `.delai-row__unit` | `fournisseurs.css`. |
| Cases à cocher (grille) | `.checkbox-grid`, `.checkbox-item` | `fournisseurs.css`. |

### 6.5 Données tabulaires & listes

| Composant | Classes | Notes |
| :--- | :--- | :--- |
| Carte avec tableau | `.card`, `.card__header`, `.card__title`, `.card__link` | Lien « Gérer → » ou secondaire. |
| Tableau | `table`, `thead`, `th`, `td` | En-têtes uppercase ; hover ligne. |
| Badges statut | `.badge`, `.badge-blue`, `.badge-green`, `.badge-red`, `.badge-muted` | Types, rôles, statuts. |
| État vide | `.empty-state` | Message centré ; parfois lien. |

### 6.6 Navigation par onglets (contenu de page)

| Composant | Classes | Notes |
| :--- | :--- | :--- |
| Barre d’onglets | `.page-tabs`, `.page-tabs-bar` | Distinct des `.nav-btn` (navigation app). |
| Onglet | `.page-tab`, `.page-tab.active` | `components.css` ; redéfinitions possibles (`planification.css`). |
| Panneau | `.tab-panel`, `.tab-panel.active` | Affichage conditionnel du contenu. |

### 6.7 Sections & labels

| Composant | Classes | Notes |
| :--- | :--- | :--- |
| Label de section | `.section-label` | Uppercase, bordure bas ; peut être cliquable. |

### 6.8 Interrupteurs

| Composant | Classes | Notes |
| :--- | :--- | :--- |
| Toggle | `.toggle`, `.toggle__track`, `.toggle__thumb`, `.toggle-wrap` | `components.css` / `reporting.css` |

### 6.9 Dashboard & KPIs

| Composant | Classes | Fichier |
| :--- | :--- | :--- |
| Grille stats | `.stats-grid` | `dashboard.css` |
| Carte KPI | `.stat-card`, `.stat-card__value`, `.stat-card__label` | Grande valeur + label uppercase. |

### 6.10 Data-viz & reporting

| Composant | Classes | Notes |
| :--- | :--- | :--- |
| Barre période + actions | `.period-bar`, `.period-btns`, `.period-btn` | Souvent combiné à `.page-tab`. |
| Carte graphique | `.chart-card`, `.chart-card__title`, `.chart-wrap` | Canvas à l’intérieur. |
| Légende graphique | `.chart-legend`, `.chart-legend__item`, `.chart-legend__dot` | Couleurs alignées sémantique. |
| Grille besoins / stock | `.besoins-label`, `.besoins-grid`, `.besoin-card`, `.besoin-card__bar`, modificateurs `--green` / `--yellow` / `--red` sur `.besoin-card__bar-fill` | Seuils visuels. |
| Cartes seuils | `.seuils-title`, `.seuils-card`, `.seuils-card__header`, `.seuils-card__label` | |
| Pills taux | `.taux-pill`, `.taux-pill--achat`, `.taux-pill--vente`, `.taux-pill__unit` | Achats vs ventes. |
| Stepper (assistant) | `.stepper`, `.stepper__step`, `.stepper__dot`, `.stepper__line`, `.stepper__subtitle` | Étapes actives / terminées. |
| Liste compacte | `.mp-cards`, `.mp-card`, `.mp-card__left`, `.mp-card__right`, … | Sélection / récap. |
| Produit sélectionné | `.produit-selectionne`, `.produit-selectionne__label`, … | |
| Bloc déclenchement | `.declenchement-block`, `.declenchement-block__header`, … | `energie.css`, `reporting.css` |

### 6.11 Planification & énergie

| Composant | Classes | Notes |
| :--- | :--- | :--- |
| Grille alertes | `.alertes-grid` | |
| Carte alerte | `.alerte-card`, `.alerte-card--achat`, `.alerte-card--vente`, `.alerte-card__badge`, … | |
| En-tête cours | `.cours-header`, `.cours-header__title`, `.cours-header__meta` | |
| Mini-KPIs cours | `.cours-kpis`, `.cours-kpi`, `.cours-kpi__label`, `.cours-kpi__value` | |
| Variations | `.variation-up`, `.variation-down`, `.variation-flat` | Couleurs vert / rouge / muted. |
| Point source (légende) | `.source-dot` | `energie.css` |
| Modale calendrier | `.modal-calendar` | `planification.css` |

### 6.12 Ventes & facturation

| Composant | Classes | Fichier |
| :--- | :--- | :--- |
| Grille détail | `.detail-grid`, `.detail-row`, `.detail-row__label`, `.detail-row__value` | `ventes.css` |
| Totaux facture | `.facture-totaux`, `.facture-ligne`, `.facture-ligne__label`, `.facture-ligne__value`, `.facture-ligne--ttc` | |
| Total estimé | `.total-estime`, `.total-estime__value` | |

### 6.13 Authentification

| Composant | Classes | Fichier |
| :--- | :--- | :--- |
| Page login | `.login-page`, `.login-card`, `.login-card__title`, `.login-card__links` | `login.css` — labels formulaire hors style « caption ». |

> **Pages associées non détaillées ici** : mot de passe oublié, reset token, setup initial, espace employé (`loginEmploye`, `homeEmploye`) — réutilisent en grande partie les mêmes tokens et motifs formulaire / carte.

### 6.14 Impression

| Composant | Notes |
| :--- | :--- |
| Vue print reporting | `reporting-print.twig` | Layout dédié export / impression ; à traiter à part (typo, marges, masquage navbar). |

### 6.15 Fichiers CSS par domaine

| Fichier | Rôle principal |
| :--- | :--- |
| `base.css` | Variables `:root`, reset, `.main`, `.empty-state` (version simple). |
| `components.css` | Cartes, tableaux, boutons, badges, modales, formulaires, toasts, onglets, toggle, légendes. |
| `navbar.css` | Navbar + notifications. |
| `dashboard.css` | Grille KPI / stat cards. |
| `login.css` | Écran connexion. |
| `responsive.css` | Breakpoints 1024px / 768px. |
| `planification.css`, `energie.css`, `reporting.css`, `ventes.css`, `fournisseurs.css` | Motifs spécifiques métier. |
