# Google Stitch Prompt — Smart-Yield redesign

How to use: Stitch generates **one screen at a time**. Paste the **GLOBAL BRIEF**
first (it locks the visual style), then generate **screen by screen** by pasting
each numbered section. UI copy is kept in French (the app is French); design
instructions are in English for accuracy.

---

```text
╔══════════════════════════════════════════════════════════════╗
║  GLOBAL BRIEF — paste this first into Google Stitch            ║
╚══════════════════════════════════════════════════════════════╝

I'm designing "Smart-Yield", a desktop application (Electron, wide screens
1280px+) for managing a renewable-energy production and trading company. The
app drives energy production (wind, solar, hydro, hydrogen, grid), MWh stock,
energy purchases/sales, and triggers buy/sell signals based on the real-time
French national electricity mix (ENTSO-E API).

GOAL: produce a MODERN, premium "industrial fintech dashboard" mockup. Keep the
visual DNA below but modernize it: more depth, clear hierarchy, polished data
visualization, micro-interactions, generous spacing.

ART DIRECTION:
- Theme: strict industrial Dark Mode (never use pure white for text).
- Backgrounds: #0C0E15 (global background), #161B2E (cards/surfaces),
  #1C2237 (elevated surface), thin 1px borders #252D45
  (prefer borders over heavy shadows for the industrial look).
- Primary color: #4F8AFF (blue) — CTAs, active states, links.
- Success / positive: #2FEEA8 (mint green). Danger: #FF4F6B (red).
  Warning / yellow: #FFB34F.
- Text: #E2E6F0 (primary), #5A6380 (secondary/labels).
- Typography: Manrope. H1 32px bold, section titles 24px semi-bold,
  body 14px, labels 11px bold UPPERCASE letter-spacing 0.05em.
- Components: rounded cards (radius 14px), pill-shaped buttons (large radius),
  colored status badges/pills, toggles, "segmented control" tabs, centered
  modals with a blurred backdrop.
- Primary buttons: translucent 10% blue fill + blue border at rest, solid blue
  fill + white text on hover (200ms transition), subtle 0.98 scale on click.
- 8px grid, 16–24px gaps between cards, max 1440px centered container.
- Data-viz: area charts with a blue→transparent gradient, thin green lines,
  stock gauges colored by threshold (red <20%, yellow 20–50%, green >50%),
  subtle grid lines #252D45 with no vertical lines.
- Add modern touches: subtle glow on active elements, thin line iconography
  (Lucide style), elegant empty states.

COMMON CHROME ON ALL INTERNAL PAGES:
Sticky top navigation bar (~64px tall):
- Left: greeting "Bonjour, [Prénom]" (links to profile).
- Center: navigation pills — Dashboard, Planification, Énergie, Stock, Ventes,
  Reporting (the active pill has a solid blue fill, white text).
- Right: role badge (e.g. "SUPER_ADMIN"), a notifications bell (with a counter
  dot + dropdown panel listing alerts), and a "Se déconnecter" button
  (discreet / danger style).
Feedback: success (green) / error (red) toasts at the top. Modals for every
create/edit/delete form.
```

```text
╔══════════════════════════════════════════════════════════════╗
║  SCREEN 1 — LOGIN (/login)                                    ║
╚══════════════════════════════════════════════════════════════╝
Full-screen login page, no navbar, #0C0E15 background.
Centered login card (max ~420px), title "Connexion".
Fields: "Mail" (email), "Mot de passe" (with a show/hide eye icon).
Full-width primary button "Se connecter".
Below the form, two discreet links: "Espace employé" and "Pwd oublié".
Clean, premium, vertically centered. Optionally a subtle dark renewable-energy
ambiance image in the background.
```

```text
╔══════════════════════════════════════════════════════════════╗
║  SCREEN 2 — SIGN-UP / ACCOUNT SETUP (/setup/token)            ║
╚══════════════════════════════════════════════════════════════╝
Full-screen page (no navbar) for creating the company administrator account
(the first SUPER_ADMIN), reached via an invitation link. Centered card, title
"Création du compte".
Fields: Email, Password + Confirmation (with password-strength rules shown),
Prénom, Nom, Raison sociale, SIRET, Nom du directeur.
Primary button "Créer le compte". Ideally presented as a mini wizard (stepper):
1) Credentials  2) Company.
```

```text
╔══════════════════════════════════════════════════════════════╗
║  SCREEN 3 — DASHBOARD (/home)                                 ║
╚══════════════════════════════════════════════════════════════╝
Main dashboard with navbar.
- Top row of 3 KPI cards (large value + uppercase label): "MWh produits
  aujourd'hui", "MWh stockés", "CA ventes aujourd'hui (€)".
- "Sources d'énergie" card with a table (columns: Source, Type [badge], Stock
  MWh, Coût prod. €/MWh, Statut [ACTIF green / INACTIF grey badge]) and a
  "Gérer →" link in the header.
- "Employés" card (super-admin only): table Nom, Prénom, Rôle [badge], Actions
  (Modifier outline / Supprimer danger buttons), plus an "Ajouter" button in the
  header that opens a modal.
Modernize with a small trend chart (sparkline) inside the KPI cards if relevant.
```

```text
╔══════════════════════════════════════════════════════════════╗
║  SCREEN 4 — PLANIFICATION (/planification)                   ║
╚══════════════════════════════════════════════════════════════╝
Page with segmented tabs: "Calendrier", "Sessions", "Mix ENTSO-E".
- Calendrier tab: a large card containing a monthly calendar (FullCalendar
  style) of production sessions, "Planifier" button in the header. Events are
  colored by source.
- Sessions tab: sessions table (Titre, Source, MWh prévus, MWh produits, Coût €,
  Début prévu, Déclenchement [AUTO/MANUEL badge], Statut [EN ATTENTE grey /
  EN COURS green / TERMINÉE blue / ANNULÉE red], contextual Actions: Lancer,
  Terminer, ↗ Créer achat, Supprimer).
- Mix ENTSO-E tab: "LIVE ENTSO-E" badge, "PRODUIRE" (blue) / "VENDRE" (red)
  alert cards, and mini-KPIs of the national electricity mix (Éolien, Solaire,
  Hydraulique, Nucléaire in %).
"Planifier une session" modal: Titre, Source, Quantité MWh, Début/Fin
(datetime), Notes.
```

```text
╔══════════════════════════════════════════════════════════════╗
║  SCREEN 5 — ÉNERGIE (/energie)                               ║
╚══════════════════════════════════════════════════════════════╝
Page with segmented tabs: "Mix ENTSO-E", "Sources", "Seuils", "Prix énergie".
- Mix ENTSO-E: card with a "LIVE ENTSO-E" badge, "Total réseau XXXXX MW" +
  timestamp, and a row of mini-KPIs (Éolien/Solaire/Hydraulique/Nucléaire in %).
  Ideally add a donut/ring of the mix.
- Sources: sources table (Source, Type [badge], Coût prod., Mix actuel [badge
  colored by %], Stock MWh, Statut, Actions), "Ajouter" button.
- Seuils: threshold-config table (Source, Seuil déclenchement [pill], Seuil
  arrêt [pill], Auto [toggle], Statut, Actions). "Configurer" button.
- Prix énergie: large area/line chart card "Évolution des prix énergie — 12
  derniers mois" (average sell price as a green line, average buy price as a
  blue gradient area), with a legend.
Top "VENDRE" alert banner if a mix drops below the stop threshold.
"Ajouter une source" modal: Nom, Type (Éolien/Solaire/Hydraulique/Hydrogène/
Réseau), Coût €/MWh, Couleur.
```

```text
╔══════════════════════════════════════════════════════════════╗
║  SCREEN 6 — STOCK (/stock)                                   ║
╚══════════════════════════════════════════════════════════════╝
Page with a "FOURNISSEURS" section-link at the top.
- "Stock d'énergie par source" card: table (Source, Type [badge], Stock MWh
  [bold value], Coût prod. €/MWh, Valeur stock €, Ajuster). "Enregistrer un
  achat" button.
- "Historique des achats" card: table (Source, Fournisseur, Quantité MWh, Prix
  achat €/MWh, Total €, Date, Actions).
"Enregistrer un achat" modal: Source, Fournisseur, Quantité, Prix, with a "Total
estimé" block computed live.
Modernize with per-source stock-level gauges.
```

```text
╔══════════════════════════════════════════════════════════════╗
║  SCREEN 7 — SUPPLIERS & CLIENTS (/fournisseurs)              ║
╚══════════════════════════════════════════════════════════════╝
"Gestion des Fournisseurs & Clients" card with a table: Nom, Type [CLIENT green
/ FOURNISSEUR blue badge], Contact, Mail, Téléphone, Délai (days), Actions
(Modifier / Supprimer). "Ajouter" button.
Add modal on 2 columns: Nom, Type, Nom contact, Fonction, Email, Téléphone,
Délai de livraison, Notes.
```

```text
╔══════════════════════════════════════════════════════════════╗
║  SCREEN 8 — SALES (/ventes)                                  ║
╚══════════════════════════════════════════════════════════════╝
- 3 KPI cards: "Chiffre d'affaires €", "Nombre de ventes", "Panier moyen €".
- "Historique des ventes" card: table (Source, Client, Quantité MWh, Prix €/MWh,
  Total € [bold value], Date, Actions: Détails / Supprimer). "Nouvelle vente +"
  button.
"Nouvelle vente" modal: Source (shows available stock), Client, Quantité, Prix
de vente, live "Total estimé" block.
```

```text
╔══════════════════════════════════════════════════════════════╗
║  SCREEN 9 — SALE DETAIL / INVOICE (/ventes/:id)             ║
╚══════════════════════════════════════════════════════════════╝
Invoice-style detail view. "← Retour aux ventes" link + "Supprimer la vente"
(danger) button at the top.
- Two side-by-side cards: "Détails de la vente" (Référence #, Date, Source
  [type badge], Client) and "Source d'énergie" (Nom, Type, Coût de prod.).
- "Détail financier" card: table (Désignation, Quantité, Prix unitaire, Total) +
  totals block (Coût de production, Prix de vente, Total encaissé highlighted).
  Premium document/invoice look.
```

```text
╔══════════════════════════════════════════════════════════════╗
║  SCREEN 10 — REPORTING (/reporting)                          ║
╚══════════════════════════════════════════════════════════════╝
Period bar (segmented "7 jours / 30 jours / 90 jours") + "Exporter CSV" and
"Exporter PDF" (outline) buttons on the right.
- Large chart card "CA Ventes vs Coûts de production": blue gradient area (CA) +
  green line (costs), with a legend.
- "Stock actuel par source d'énergie" section: a grid of cards, each with the
  source name, MWh value, sub-label, the trigger threshold, and a colored
  progress bar (green/yellow/red depending on the level vs threshold).
Polished, readable, premium analytics dashboard.
```

```text
╔══════════════════════════════════════════════════════════════╗
║  SCREEN 11 — PROFILE (/profil) + secondary auth screens       ║
╚══════════════════════════════════════════════════════════════╝
- Profil: card with the signed-in account's information (identity, email, role,
  company) with an edit form and a password change.
- Forgot password (/forgot-password): centered card, email field, "Envoyer le
  lien" button.
- Reset (/reset-password/token): centered card, new password + confirmation.
- Employee login (/employes/login): a twin of screen 1, for employees
  (Admin / Opérateur).
Same visual language as the auth screens (centered card, dark premium).
```
