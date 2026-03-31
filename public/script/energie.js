document.addEventListener('DOMContentLoaded', function () {
    // ── Gestion des onglets ───────────────────────────────────
    document.querySelectorAll('[data-tab]').forEach(function (tab) {
        tab.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelectorAll('[data-tab]').forEach(function (t) { t.classList.remove('active'); });
            document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
            tab.classList.add('active');
            var panel = document.getElementById('tab-' + tab.dataset.tab);
            if (panel) panel.classList.add('active');
            if (tab.dataset.tab === 'prix') initPrixChart();
        });
    });

    // ── Courbe historique des prix ────────────────────────────
    var prixChart = null;
    var prixLoaded = {};

    var UNITS = {
        WTI: '$/Bbl', BRENT: '$/Bbl',
        NATURAL_GAS: '$/MMBtu', COPPER: '$/Lb', ALUMINUM: '$/T'
    };

    function initPrixChart() {
        var select = document.getElementById('prix-select');
        if (!select) return;
        loadPrix(select.value);
        select.addEventListener('change', function () { loadPrix(this.value); });
    }

    function loadPrix(symbole) {
        var canvas  = document.getElementById('chart-prix');
        var emptyEl = document.getElementById('prix-empty');
        var unitEl  = document.getElementById('prix-unit');
        if (!canvas) return;

        if (unitEl) unitEl.textContent = UNITS[symbole] || '';

        fetch('/energie/prix-historique?symbole=' + symbole)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.labels || !data.labels.length) {
                    canvas.style.display = 'none';
                    if (emptyEl) emptyEl.style.display = '';
                    return;
                }
                canvas.style.display = '';
                if (emptyEl) emptyEl.style.display = 'none';

                var cfg = {
                    type: 'line',
                    data: {
                        labels: data.labels,
                        datasets: [{
                            label: symbole,
                            data: data.values,
                            borderColor: 'rgba(79,138,255,0.85)',
                            backgroundColor: 'rgba(79,138,255,0.10)',
                            borderWidth: 2,
                            pointRadius: 3,
                            pointHoverRadius: 5,
                            fill: true,
                            tension: 0.3
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { ticks: { color: '#5A6380', font: { size: 10 } }, grid: { color: 'rgba(37,45,69,.5)' } },
                            y: { ticks: { color: '#5A6380', font: { size: 10 } }, grid: { color: 'rgba(37,45,69,.5)' } }
                        }
                    }
                };

                if (prixChart) { prixChart.destroy(); }
                prixChart = new Chart(canvas, cfg);
            })
            .catch(function () {
                canvas.style.display = 'none';
                if (emptyEl) emptyEl.style.display = '';
            });
    }
});
