document.addEventListener('DOMContentLoaded', function () {
    var chartEl = document.getElementById('chart-ca');
    if (!chartEl) return;
    var rawData = {};
    var dataEl = document.getElementById('reporting-data');
    if (dataEl) { try { rawData = JSON.parse(dataEl.textContent); } catch (e) {} }
    function buildDatasets(period) {
        var d = rawData[period] || { labels: [], ca: [], couts: [] };
        return { labels: d.labels, datasets: [
            { label: 'CA Ventes', data: d.ca, backgroundColor: 'rgba(47,238,168,0.75)', borderRadius: 3, borderSkipped: false },
            { label: 'Coûts production', data: d.couts, backgroundColor: 'rgba(79,138,255,0.55)', borderRadius: 3, borderSkipped: false }
        ]};
    }
    var currentPeriod = '7';
    var chart = new Chart(chartEl, { type: 'bar', data: buildDatasets(currentPeriod), options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#5A6380', font: { size: 10 } }, grid: { color: 'rgba(37,45,69,.5)' } }, y: { ticks: { color: '#5A6380', font: { size: 10 } }, grid: { color: 'rgba(37,45,69,.5)' } } } } });
    document.querySelectorAll('.period-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.period-btn').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            currentPeriod = btn.dataset.period;
            var d = buildDatasets(currentPeriod);
            chart.data.labels = d.labels; chart.data.datasets = d.datasets; chart.update();
        });
    });
});
