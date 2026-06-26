/**
 * Reporting — Chart.js (refonte) :
 * deux séries en barres groupées pleines — CA Ventes (primary) et
 * Coûts production (success), fidèle aux maquettes.
 */
document.addEventListener('DOMContentLoaded', function () {
    var chartEl = document.getElementById('chart-ca');
    if (!chartEl) return;

    var GRID = '#252D45';
    var PRIMARY = '#4F8AFF';
    var SUCCESS = '#2FEEA8';

    var rawData = {};
    var dataEl = document.getElementById('reporting-data');
    if (dataEl) {
        try {
            rawData = JSON.parse(dataEl.textContent);
        } catch (e) {}
    }

    function buildDatasets(period) {
        var d = rawData[period] || { labels: [], ca: [], couts: [] };
        return {
            labels: d.labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'CA Ventes',
                    data: d.ca,
                    backgroundColor: PRIMARY,
                    borderRadius: 4,
                    borderSkipped: false,
                    order: 1,
                    yAxisID: 'y'
                },
                {
                    type: 'bar',
                    label: 'Coûts production',
                    data: d.couts,
                    backgroundColor: SUCCESS,
                    borderRadius: 4,
                    borderSkipped: false,
                    order: 1,
                    yAxisID: 'y'
                }
            ]
        };
    }

    var built = buildDatasets('7');
    var chart = new Chart(chartEl, {
        type: 'bar',
        data: built,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    ticks: { color: '#5A6380', font: { size: 10 } },
                    grid: { display: false },
                    border: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: '#5A6380', font: { size: 10 } },
                    grid: { color: GRID },
                    border: { display: false }
                }
            }
        }
    });

    document.querySelectorAll('.period-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.period-btn').forEach(function (b) {
                b.classList.remove('active');
            });
            btn.classList.add('active');
            var next = buildDatasets(btn.dataset.period);
            chart.data.labels = next.labels;
            chart.data.datasets = next.datasets;
            chart.update();
        });
    });
});
