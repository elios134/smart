// ── energie.js (côté navigateur) ──────────────────────────────
// Ce fichier s'exécute dans le NAVIGATEUR (pas sur le serveur). Il gère les
// interactions de la page Énergie : changement d'onglets, affichage du graphique
// des prix (via Chart.js), et pré-remplissage de la modale d'édition d'une source.
// ──────────────────────────────────────────────────────────────

// On attend que toute la page HTML soit chargée avant de manipuler les éléments.
document.addEventListener('DOMContentLoaded', function () {
    // ── Onglets ───────────────────────────────────────────────
    // Chaque bouton possédant un attribut data-tab est un onglet cliquable.
    document.querySelectorAll('[data-tab]').forEach(function (tab) {
        tab.addEventListener('click', function (e) {
            e.preventDefault(); // Empêche le comportement par défaut du lien (#).
            // On désactive d'abord TOUS les onglets et TOUS les panneaux...
            document.querySelectorAll('[data-tab]').forEach(function (t) { t.classList.remove('active'); });
            document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
            // ...puis on active uniquement l'onglet cliqué.
            tab.classList.add('active');
            // On retrouve le panneau correspondant par son id (ex: "tab-prix") et on l'affiche.
            var panel = document.getElementById('tab-' + tab.dataset.tab);
            if (panel) panel.classList.add('active');
            // Cas particulier : si on ouvre l'onglet "prix", on charge le graphique (à la demande).
            if (tab.dataset.tab === 'prix') chargerPrixEnergie();
        });
    });

    // ── Donut du mix national (onglet Mix, affiché dès le chargement) ──
    // Les % sont lus depuis les attributs data-* du <canvas> (rendus par Twig).
    // Aucune requête serveur : pure présentation de données déjà dans la page.
    (function renderMixDonut() {
        var canvas = document.getElementById('chart-mix');
        if (!canvas || typeof Chart === 'undefined') return;
        var d = canvas.dataset;
        var defs = [
            { key: 'eolien',      label: 'Éolien',      color: '#4F8AFF' },
            { key: 'solaire',     label: 'Solaire',     color: '#FFB34F' },
            { key: 'hydraulique', label: 'Hydraulique', color: '#2FEEA8' },
            { key: 'nucleaire',   label: 'Nucléaire',   color: '#7782A3' }
        ];
        var labels = [], values = [], colors = [];
        defs.forEach(function (t) {
            var v = parseFloat(d[t.key]);
            if (!isNaN(v)) { labels.push(t.label); values.push(v); colors.push(t.color); }
        });
        if (!values.length) return; // Aucune valeur exploitable → on n'affiche pas de donut.
        new Chart(canvas, {
            type: 'doughnut',
            data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, borderColor: '#161B2E', borderWidth: 3 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '66%', plugins: { legend: { display: false } } }
        });
    })();

    // ── Graphique prix énergie (chargé à l'ouverture du tab) ─────
    var prixChart = null;    // Référence au graphique Chart.js (pour pouvoir le détruire/recréer).
    var prixCharge = false;  // Évite de recharger les données à chaque clic sur l'onglet.

    function chargerPrixEnergie() {
        if (prixCharge) return; // Déjà chargé → on ne refait rien.
        var canvas  = document.getElementById('chart-prix-energie'); // Zone de dessin du graphique.
        var emptyEl = document.getElementById('prix-energie-empty');  // Message "aucune donnée".
        if (!canvas) return; // Sécurité : si le canvas n'existe pas, on arrête.

        // On demande au serveur les données d'historique des prix (réponse JSON).
        fetch('/energie/prix-historique')
            .then(function (r) { return r.json(); }) // On transforme la réponse en objet JS.
            .then(function (data) {
                // Y a-t-il au moins une vraie valeur (non null) dans les ventes OU les achats ?
                var aDesData = data.ventes.some(function (v) { return v !== null; }) ||
                               data.achats.some(function (a) { return a !== null; });

                // Aucune donnée → on cache le graphique et on affiche le message vide.
                if (!aDesData) {
                    canvas.style.display = 'none';
                    if (emptyEl) emptyEl.style.display = '';
                    return;
                }

                if (prixChart) prixChart.destroy(); // On détruit l'ancien graphique s'il existait.
                var GRID = '#252D45'; // Couleur des lignes de la grille (gris foncé, thème sombre).
                // Création du graphique en courbes (line) avec deux séries : achat et vente.
                prixChart = new Chart(canvas, {
                    type: 'line',
                    data: {
                        labels: data.labels, // Les 12 mois en abscisse (axe X).
                        datasets: [
                            {
                                // ── Série 1 : Prix d'achat (courbe pleine bleue avec dégradé) ──
                                label: 'Prix achat (€/MWh)',
                                data: data.achats,
                                borderColor: '#4F8AFF',
                                // Remplissage dégradé sous la courbe (calculé dynamiquement).
                                backgroundColor: function (context) {
                                    var chart = context.chart;
                                    var area = chart.chartArea;
                                    // Tant que la zone de dessin n'est pas connue, on renvoie une couleur simple.
                                    if (!area) return 'rgba(79, 138, 255, 0.12)';
                                    // Dégradé vertical : plus opaque en haut, transparent en bas.
                                    var g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
                                    g.addColorStop(0, 'rgba(79, 138, 255, 0.32)');
                                    g.addColorStop(1, 'rgba(79, 138, 255, 0.02)');
                                    return g;
                                },
                                borderWidth: 2,
                                pointRadius: 4,        // Taille des points.
                                pointHoverRadius: 6,   // Taille des points au survol.
                                fill: true,            // On remplit sous la courbe (le dégradé ci-dessus).
                                tension: 0.3,          // Courbe légèrement arrondie (0 = lignes droites).
                                spanGaps: true,        // Relie les points malgré les trous (mois sans donnée).
                                order: 1               // Ordre d'empilement (dessinée en premier).
                            },
                            {
                                // ── Série 2 : Prix de vente (courbe verte en pointillés, sans remplissage) ──
                                label: 'Prix vente (€/MWh)',
                                data: data.ventes,
                                borderColor: '#2FEEA8',
                                backgroundColor: 'transparent',
                                borderWidth: 2,
                                borderDash: [6, 4],    // Trait en pointillés (6px de trait, 4px de vide).
                                pointRadius: 4,
                                pointHoverRadius: 6,
                                fill: false,           // Pas de remplissage sous cette courbe.
                                tension: 0.3,
                                spanGaps: true,
                                order: 2
                            }
                        ]
                    },
                    options: {
                        responsive: true,            // Le graphique s'adapte à la largeur disponible.
                        maintainAspectRatio: false,  // Il peut prendre toute la hauteur de son conteneur.
                        plugins: { legend: { display: false } }, // On cache la légende automatique.
                        scales: {
                            // Axe X (les mois) : libellés gris, sans grille ni bordure.
                            x: {
                                ticks: { color: '#5A6380', font: { size: 10 } },
                                grid: { display: false },
                                border: { display: false }
                            },
                            // Axe Y (les prix) : libellés suffixés de " €", grille discrète.
                            y: {
                                ticks: { color: '#5A6380', font: { size: 10 }, callback: function (v) { return v + ' €'; } },
                                grid: { color: GRID },
                                border: { display: false }
                            }
                        }
                    }
                });
                prixCharge = true; // On note que le graphique est désormais chargé.
            })
            .catch(function () {
                // En cas d'erreur réseau, on affiche le message vide plutôt qu'un graphique cassé.
                if (emptyEl) emptyEl.style.display = '';
                canvas.style.display = 'none';
            });
    }

    // ── Pré-remplissage checkbox Actif dans modal édition source ──
    // Quand on ouvre la modale d'édition d'une source, on coche/décoche la case "Actif"
    // selon la valeur stockée dans l'attribut data-actif du bouton cliqué.
    document.querySelectorAll('[data-modal-open="modal-source-edit"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var actifCheckbox = document.getElementById('edit-s-actif');
            if (actifCheckbox) {
                // data-actif vaut "1" (actif) ou autre chose (inactif) → on coche si === '1'.
                actifCheckbox.checked = btn.dataset.actif === '1';
            }
        });
    });
});
