document.addEventListener('DOMContentLoaded', function () {
    var inputQte  = document.getElementById('achat-quantite');
    var inputPrix = document.getElementById('achat-prix');
    var spanTotal = document.getElementById('achat-total-estime');
    function calc() {
        if (!inputQte || !inputPrix || !spanTotal) return;
        spanTotal.textContent = window.SmartYield.calcTotal(inputQte.value, inputPrix.value);
    }
    if (inputQte)  inputQte.addEventListener('input', calc);
    if (inputPrix) inputPrix.addEventListener('input', calc);
});
