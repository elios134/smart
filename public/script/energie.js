// ── ENERGIE.JS ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

    // ── ONGLETS ────────────────────────────────────────────────
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

    // ── CALCUL TOTAL ESTIMÉ — MODALE VENTE ────────────────────
    var selectSource = document.getElementById('vente-sourceId');
    var inputQte     = document.getElementById('vente-quantite');
    var inputPrix    = document.getElementById('vente-prix');
    var spanTotal    = document.getElementById('vente-total-estime');

    function calculerTotalVente() {
        if (!inputQte || !inputPrix || !spanTotal) return;
        var qte   = parseFloat(inputQte.value)  || 0;
        var prix  = parseFloat(inputPrix.value) || 0;
        spanTotal.textContent = (qte * prix).toFixed(2) + ' €';
    }

    if (inputQte)  inputQte.addEventListener('input', calculerTotalVente);
    if (inputPrix) inputPrix.addEventListener('input', calculerTotalVente);

});
