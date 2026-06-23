/**
 * Reporting — Chart.js §3 design.md :
 * série « flux » en barres avec gradient primary → transparent,
 * consommation / coûts en ligne success pointillée.
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

    function gradientPrimaryBars(chart) {
        var area = chart.chartArea;
        if (!area) return 'rgba(79, 138, 255, 0.72)';
        var g = chart.ctx.createLinearGradient(0, area.bottom, 0, area.top);
        g.addColorStop(0, 'rgba(79, 138, 255, 0.04)');
        g.addColorStop(1, 'rgba(79, 138, 255, 0.92)');
        return g;
    }

    function buildDatasets(period) {
        var d = rawData[period] || { labels: [], ca: [], couts: [] };
        return {
            labels: d.labels,
            datasets: [
                {
                    type: 'line',
                    label: 'Coûts production',
                    data: d.couts,
                    borderColor: SUCCESS,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [6, 4],
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    pointBackgroundColor: SUCCESS,
                    pointBorderColor: SUCCESS,
                    tension: 0.25,
                    fill: false,
                    order: 0,
                    yAxisID: 'y'
                },
                {
                    type: 'bar',
                    label: 'CA Ventes',
                    data: d.ca,
                    backgroundColor: function (context) {
                        return gradientPrimaryBars(context.chart);
                    },
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
