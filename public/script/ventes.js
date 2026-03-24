document.addEventListener('DOMContentLoaded', function () {
    var inputQte  = document.getElementById('vente-quantite');
    var inputPrix = document.getElementById('vente-prix');
    var spanTotal = document.getElementById('vente-total-estime');
    function calc() {
        if (!inputQte || !inputPrix || !spanTotal) return;
        spanTotal.textContent = ((parseFloat(inputQte.value)||0) * (parseFloat(inputPrix.value)||0)).toFixed(2) + ' €';
    }
    if (inputQte)  inputQte.addEventListener('input', calc);
    if (inputPrix) inputPrix.addEventListener('input', calc);
});
