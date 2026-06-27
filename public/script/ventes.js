document.addEventListener('DOMContentLoaded', function () {
    var inputQte  = document.getElementById('vente-quantite');
    var inputPrix = document.getElementById('vente-prix');
    var spanTotal = document.getElementById('vente-total-estime');
    function calc() {
        if (!inputQte || !inputPrix || !spanTotal) return;
        spanTotal.textContent = window.SmartYield.calcTotal(inputQte.value, inputPrix.value);
    }
    if (inputQte)  inputQte.addEventListener('input', calc);
    if (inputPrix) inputPrix.addEventListener('input', calc);

    // Ouverture auto de la modale de vente via /ventes?source=ID
    // (bouton « Vendre » d'une alerte de la page Énergie). On pré-sélectionne la
    // source puis on ouvre la modale (classe .open, gérée par modals.js).
    var presetSource = new URLSearchParams(window.location.search).get('source');
    if (presetSource) {
        var modal  = document.getElementById('modal-vente-add');
        var select = modal ? modal.querySelector('select[name="sourceId"]') : null;
        if (modal && select) {
            select.value = presetSource;
            modal.classList.add('open');
        }
    }
});
