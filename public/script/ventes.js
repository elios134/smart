// ── VENTES.JS — Calcul total estimé dans la modal ──────────────────
document.addEventListener('DOMContentLoaded', function () {

    var selectProduit = document.getElementById('vente-produitId');
    var inputQte      = document.getElementById('vente-quantite');
    var spanTotal     = document.getElementById('vente-total-estime');

    if (!selectProduit || !inputQte || !spanTotal) return;

    function calculerTotal() {
        var option  = selectProduit.options[selectProduit.selectedIndex];
        var prix    = parseFloat(option ? option.dataset.prix : 0) || 0;
        var qte     = parseFloat(inputQte.value) || 0;
        var total   = (prix * qte).toFixed(2);
        spanTotal.textContent = total + '$';
    }

    selectProduit.addEventListener('change', calculerTotal);
    inputQte.addEventListener('input', calculerTotal);

});
