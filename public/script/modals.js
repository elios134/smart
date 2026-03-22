/**
 * modals.js — Gestionnaire centralisé des modales SmartYield
 *
 * API via data-attributes sur les boutons déclencheurs :
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ data-modal-open="modalId"     → ouvre la modale                 │
 * │ data-modal-close              → ferme la modale parente         │
 * │ data-modal-close="modalId"    → ferme une modale spécifique     │
 * │ data-form="formId"            → id du <form> dont changer action│
 * │ data-action="/route/:id/edit" → nouvelle action du formulaire   │
 * │ data-fields='{"inputId":"v"}' → JSON des champs à remplir       │
 * │ data-confirm-text="..."       → texte de confirmation           │
 * │ data-confirm-target="elemId"  → élément où écrire ce texte      │
 * └─────────────────────────────────────────────────────────────────┘
 */

document.addEventListener('DOMContentLoaded', function () {

    // ── Ouvrir ─────────────────────────────────────────────────────
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-modal-open]');
        if (!btn) return;

        var modal = document.getElementById(btn.dataset.modalOpen);
        if (!modal) return;

        // Remplir les champs du formulaire
        if (btn.dataset.fields) {
            try {
                var fields = JSON.parse(btn.dataset.fields);
                Object.keys(fields).forEach(function (id) {
                    var el = document.getElementById(id);
                    if (el) el.value = fields[id] !== null && fields[id] !== undefined ? fields[id] : '';
                });
            } catch (err) {
                console.error('[modals.js] data-fields JSON invalide :', err);
            }
        }

        // Changer l'action du formulaire
        if (btn.dataset.action && btn.dataset.form) {
            var form = document.getElementById(btn.dataset.form);
            if (form) form.action = btn.dataset.action;
        }

        // Injecter un texte de confirmation
        if (btn.dataset.confirmText && btn.dataset.confirmTarget) {
            var target = document.getElementById(btn.dataset.confirmTarget);
            if (target) target.textContent = btn.dataset.confirmText;
        }

        modal.classList.add('open');
    });

    // ── Fermer via bouton ──────────────────────────────────────────
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-modal-close]');
        if (btn === null) return;

        var id = btn.getAttribute('data-modal-close');
        if (id) {
            var modal = document.getElementById(id);
            if (modal) modal.classList.remove('open');
        } else {
            var parent = btn.closest('.modal-backdrop');
            if (parent) parent.classList.remove('open');
        }
    });

    // ── Fermer au clic sur le backdrop ────────────────────────────
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('modal-backdrop')) {
            e.target.classList.remove('open');
        }
    });

    // ── Fermer avec Escape ────────────────────────────────────────
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-backdrop.open').forEach(function (m) {
                m.classList.remove('open');
            });
        }
    });

});
