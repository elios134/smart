# Maquettes Smart-Yield — base de refonte

Prototype HTML/CSS **statique et navigable** des écrans de Smart-Yield, destiné à
servir de **base visuelle pour une refonte complète** de l'interface.

## Contenu

| Fichier | Écran | Interactions |
|---|---|---|
| `index.html` | Accueil / sommaire | liens vers tous les écrans |
| `dashboard.html` | Tableau de bord | modales employé (ajouter / modifier / supprimer) |
| `planification.html` | Planification | onglets Calendrier / Sessions · modales Planifier / Terminer / Créer achat / Supprimer |
| `energie.html` | Énergie | onglets Mix / Sources / Seuils / Prix · modales source + seuil + import · donut + graphe |
| `stock.html` | Stock | modales Achat (total live) / Ajuster / Supprimer · jauges de remplissage |
| `ventes.html` | Ventes | modale Nouvelle vente (total live) / Supprimer |
| `vente-detail.html` | Détail d'une vente | facture · modale Supprimer |
| `reporting.html` | Reporting | bascule période 7/30/90 j (graphe live) · exports |
| `profil.html` | Profil | œil afficher/masquer mot de passe |

## Socle commun

- `styles.css` — design system (tokens sombres, navbar, cartes, tableaux, pastilles, KPI, jauges, formulaires, modales). **Point de départ unique** pour harmoniser la refonte.
- `app.js` — logique générique pilotée par `data-*` : onglets (`data-tab`), modales (`data-open` / `data-close`), total estimé live (`data-calc` / `data-total`), œil mot de passe (`data-eye`).

## Utilisation

Ouvrir `index.html` dans un navigateur (double-clic). La navigation entre écrans
fonctionne via les liens de la barre du haut. Aucune dépendance à installer :
les polices (Manrope), icônes (Tabler) et graphiques (Chart.js) sont chargés par CDN.

## Notes

- Données **fictives** (purement illustratives).
- Thème sombre uniquement, conforme aux tokens actuels de l'app.
- Le sous-onglet « Mix ENTSO-E » de la Planification a été retiré (doublon avec la page Énergie).
