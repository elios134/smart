document.addEventListener('DOMContentLoaded', function () {
    // ── Onglets ───────────────────────────────────────────────
    document.querySelectorAll('[data-tab]').forEach(function (tab) {
        tab.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelectorAll('[data-tab]').forEach(function (t) { t.classList.remove('active'); });
            document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
            tab.classList.add('active');
            var panel = document.getElementById('tab-' + tab.dataset.tab);
            if (panel) panel.classList.add('active');
            if (tab.dataset.tab === 'prix') chargerPrixEnergie();
        });
    });

    // ── Graphique prix énergie (chargé à l'ouverture du tab) ─────
    var prixChart = null;
    var prixCharge = false;

    function chargerPrixEnergie() {
        if (prixCharge) return;
        var canvas  = document.getElementById('chart-prix-energie');
        var emptyEl = document.getElementById('prix-energie-empty');
        if (!canvas) return;

        fetch('/energie/prix-historique')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var aDesData = data.ventes.some(function (v) { return v !== null; }) ||
                               data.achats.some(function (a) { return a !== null; });

                if (!aDesData) {
                    canvas.style.display = 'none';
                    if (emptyEl) emptyEl.style.display = '';
                    return;
                }

                if (prixChart) prixChart.destroy();
                var GRID = '#252D45';
                prixChart = new Chart(canvas, {
                    type: 'line',
                    data: {
                        labels: data.labels,
                        datasets: [
                            {
                                label: 'Prix achat (€/MWh)',
                                data: data.achats,
                                borderColor: '#4F8AFF',
                                backgroundColor: function (context) {
                                    var chart = context.chart;
                                    var area = chart.chartArea;
                                    if (!area) return 'rgba(79, 138, 255, 0.12)';
                                    var g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
                                    g.addColorStop(0, 'rgba(79, 138, 255, 0.32)');
                                    g.addColorStop(1, 'rgba(79, 138, 255, 0.02)');
                                    return g;
                                },
                                borderWidth: 2,
                                pointRadius: 4,
                                pointHoverRadius: 6,
                                fill: true,
                                tension: 0.3,
                                spanGaps: true,
                                order: 1
                            },
                            {
                                label: 'Prix vente (€/MWh)',
                                data: data.ventes,
                                borderColor: '#2FEEA8',
                                backgroundColor: 'transparent',
                                borderWidth: 2,
                                borderDash: [6, 4],
                                pointRadius: 4,
                                pointHoverRadius: 6,
                                fill: false,
                                tension: 0.3,
                                spanGaps: true,
                                order: 2
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: {
                                ticks: { color: '#5A6380', font: { size: 10 } },
                                grid: { display: false },
                                border: { display: false }
                            },
                            y: {
                                ticks: { color: '#5A6380', font: { size: 10 }, callback: function (v) { return v + ' €'; } },
                                grid: { color: GRID },
                                border: { display: false }
                            }
                        }
                    }
                });
                prixCharge = true;
            })
            .catch(function () {
                if (emptyEl) emptyEl.style.display = '';
                canvas.style.display = 'none';
            });
    }

    // ── Pré-remplissage checkbox Actif dans modal édition source ──
    document.querySelectorAll('[data-modal-open="modal-source-edit"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var actifCheckbox = document.getElementById('edit-s-actif');
            if (actifCheckbox) {
                actifCheckbox.checked = btn.dataset.actif === '1';
            }
        });
    });
});
