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
});
