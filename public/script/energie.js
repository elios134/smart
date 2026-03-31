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
                prixChart = new Chart(canvas, {
                    type: 'line',
                    data: {
                        labels: data.labels,
                        datasets: [
                            {
                                label: 'Prix vente (€/MWh)',
                                data: data.ventes,
                                borderColor: 'rgba(47,238,168,0.85)',
                                backgroundColor: 'rgba(47,238,168,0.10)',
                                borderWidth: 2,
                                pointRadius: 4,
                                pointHoverRadius: 6,
                                fill: true,
                                tension: 0.3,
                                spanGaps: true
                            },
                            {
                                label: 'Prix achat (€/MWh)',
                                data: data.achats,
                                borderColor: 'rgba(79,138,255,0.85)',
                                backgroundColor: 'rgba(79,138,255,0.10)',
                                borderWidth: 2,
                                pointRadius: 4,
                                pointHoverRadius: 6,
                                fill: true,
                                tension: 0.3,
                                spanGaps: true
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { ticks: { color: '#5A6380', font: { size: 10 } }, grid: { color: 'rgba(37,45,69,.5)' } },
                            y: {
                                ticks: { color: '#5A6380', font: { size: 10 }, callback: function (v) { return v + ' €'; } },
                                grid: { color: 'rgba(37,45,69,.5)' }
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
