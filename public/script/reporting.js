// ── REPORTING.JS ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

    // ── ONGLETS ────────────────────────────────────────────────────
    document.querySelectorAll('.page-tab').forEach(function (tab) {
        tab.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelectorAll('.page-tab').forEach(function (t) { t.classList.remove('active'); });
            document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
            tab.classList.add('active');
            var panel = document.getElementById('tab-' + tab.dataset.tab);
            if (panel) panel.classList.add('active');
        });
    });

    // ── CHART.JS ───────────────────────────────────────────────────
    var chartEl = document.getElementById('chart-ca');
    if (!chartEl) return;

    var rawData = {};
    var dataEl = document.getElementById('reporting-data');
    if (dataEl) { try { rawData = JSON.parse(dataEl.textContent); } catch (e) {} }

    function buildDatasets(period) {
        var d = rawData[period] || { labels: [], ca: [], couts: [] };
        return {
            labels: d.labels,
            datasets: [
                {
                    label: 'CA',
                    data: d.ca,
                    backgroundColor: 'rgba(47,238,168,0.75)',
                    borderRadius: 3,
                    borderSkipped: false
                },
                {
                    label: 'Coûts',
                    data: d.couts,
                    backgroundColor: 'rgba(79,138,255,0.55)',
                    borderRadius: 3,
                    borderSkipped: false
                }
            ]
        };
    }

    var currentPeriod = '30';
    var chart = new Chart(chartEl, {
        type: 'bar',
        data: buildDatasets(currentPeriod),
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { ticks: { color: '#5A6380', font: { size: 10 } }, grid: { color: 'rgba(37,45,69,.5)' } },
                y: { ticks: { color: '#5A6380', font: { size: 10 } }, grid: { color: 'rgba(37,45,69,.5)' } }
            }
        }
    });

    // Boutons période
    document.querySelectorAll('.period-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.period-btn').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            currentPeriod = btn.dataset.period;
            var d = buildDatasets(currentPeriod);
            chart.data.labels   = d.labels;
            chart.data.datasets = d.datasets;
            chart.update();
        });
    });

    // ── STEPPER MODAL ──────────────────────────────────────────────
    var step1 = document.getElementById('seuil-step-1');
    var step2 = document.getElementById('seuil-step-2');
    if (!step1 || !step2) return;

    var matieres = {};
    var mEl = document.getElementById('matieres-data');
    if (mEl) { try { matieres = JSON.parse(mEl.textContent); } catch (e) {} }

    var selectMatiere = document.getElementById('seuil-matiereId');
    var mpCards       = document.getElementById('mp-preview-cards');

    function updateMpCards() {
        if (!selectMatiere || !mpCards) return;
        var id = selectMatiere.value;
        if (!id) { mpCards.innerHTML = ''; return; }
        // Afficher toutes les matieres comme cards, avec la sélectionnée en premier
        var html = '';
        Object.keys(matieres).forEach(function (key) {
            var m = matieres[key];
            html +=
                '<div class="mp-card">' +
                    '<div class="mp-card__left">' +
                        '<div class="mp-card__label">Matière première</div>' +
                        '<div class="mp-card__nom">' + m.nom + '</div>' +
                    '</div>' +
                    '<div class="mp-card__right">' +
                        '<div class="mp-card__prix-label">Prix MP Actuel</div>' +
                        '<div class="mp-card__prix">' + m.prixActuel + '$</div>' +
                    '</div>' +
                '</div>';
        });
        mpCards.innerHTML = html;
    }

    if (selectMatiere) selectMatiere.addEventListener('change', updateMpCards);

    // Suivant
    var btnSuivant = document.getElementById('seuil-btn-suivant');
    if (btnSuivant) {
        btnSuivant.addEventListener('click', function () {
            if (!selectMatiere || !selectMatiere.value) return;
            var m = matieres[selectMatiere.value];
            if (!m) return;

            var selVal = document.getElementById('seuil-sel-val');
            var selPrix = document.getElementById('seuil-sel-prix');
            if (selVal)  selVal.textContent  = m.nom;
            if (selPrix) selPrix.textContent = m.prixActuel + '$';

            var hiddenId = document.getElementById('seuil-hidden-matiereId');
            if (hiddenId) hiddenId.value = selectMatiere.value;

            // Stepper
            var dot1 = document.getElementById('stepper-dot-1');
            var dot2 = document.getElementById('stepper-dot-2');
            dot1.classList.remove('active'); dot1.classList.add('done');
            dot2.classList.add('active');

            step1.style.display = 'none';
            step2.style.display = 'block';
        });
    }

    // Retour
    var btnRetour = document.getElementById('seuil-btn-retour');
    if (btnRetour) {
        btnRetour.addEventListener('click', function () {
            var dot1 = document.getElementById('stepper-dot-1');
            var dot2 = document.getElementById('stepper-dot-2');
            dot1.classList.remove('done'); dot1.classList.add('active');
            dot2.classList.remove('active');
            step2.style.display = 'none';
            step1.style.display = 'block';
        });
    }

    // Reset à la fermeture
    document.addEventListener('click', function (e) {
        var isClose = e.target.classList.contains('modal-backdrop') ||
                      !!e.target.closest('[data-modal-close="modal-seuil-add"]');
        if (!isClose) return;
        setTimeout(function () {
            step1.style.display = 'block';
            step2.style.display = 'none';
            var dot1 = document.getElementById('stepper-dot-1');
            var dot2 = document.getElementById('stepper-dot-2');
            if (dot1) { dot1.classList.add('active'); dot1.classList.remove('done'); }
            if (dot2) { dot2.classList.remove('active'); }
            if (selectMatiere) selectMatiere.value = '';
            if (mpCards) mpCards.innerHTML = '';
        }, 200);
    });

});
