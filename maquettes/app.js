/* ── Smart-Yield — logique commune des maquettes ──
   Gère, par délégation d'évènements, les onglets et les modales.
     [data-tab="idPanneau"] → onglet : affiche le .panel#idPanneau
     [data-open="idModale"] → ouvre la modale #idModale
     [data-close]           → ferme les modales ouvertes
   Fermeture aussi au clic sur le fond et à la touche Échap. */

document.addEventListener('click', function (e) {
  var open = e.target.closest('[data-open]');
  if (open) { var m = document.getElementById(open.getAttribute('data-open')); if (m) m.classList.add('on'); return; }

  var tab = e.target.closest('[data-tab]');
  if (tab) {
    var scope = tab.closest('.has-tabs') || document;
    scope.querySelectorAll('[data-tab]').forEach(function (t) { t.classList.remove('on'); });
    scope.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('on'); });
    tab.classList.add('on');
    var panel = document.getElementById(tab.getAttribute('data-tab'));
    if (panel) panel.classList.add('on');
    return;
  }

  if (e.target.closest('[data-close]') || e.target.classList.contains('modal-back')) closeModals();
});

function closeModals() {
  document.querySelectorAll('.modal-back.on').forEach(function (m) { m.classList.remove('on'); });
}

document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModals(); });

/* Total estimé live : <input data-calc="groupe"> × <input data-calc="groupe"> → <span data-total="groupe"> */
document.addEventListener('input', function (e) {
  var g = e.target.getAttribute && e.target.getAttribute('data-calc');
  if (!g) return;
  var inputs = document.querySelectorAll('[data-calc="' + g + '"]');
  var v = 1, n = 0;
  inputs.forEach(function (i) { v *= (parseFloat(i.value) || 0); n++; });
  if (n < 2) v = 0;
  var out = document.querySelector('[data-total="' + g + '"]');
  if (out) out.textContent = (v || 0).toLocaleString('fr-FR') + ' €';
});

/* Œil afficher/masquer mot de passe */
document.addEventListener('click', function (e) {
  var eye = e.target.closest('[data-eye]');
  if (!eye) return;
  var input = eye.parentNode.querySelector('input');
  var hidden = input.type === 'password';
  input.type = hidden ? 'text' : 'password';
  eye.innerHTML = hidden ? '<i class="ti ti-eye-off"></i>' : '<i class="ti ti-eye"></i>';
});
