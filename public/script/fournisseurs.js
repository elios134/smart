// ── FOURNISSEURS.JS — Pré-cochage des matières à l'édition ─────────
document.addEventListener('DOMContentLoaded', function () {

    document.querySelectorAll('[data-modal-open="modal-fournisseur-edit"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var ids = (btn.dataset.matieres || '').split(',').filter(Boolean);
            document.querySelectorAll('#edit-f-matieres input[type="checkbox"]').forEach(function (cb) {
                cb.checked = ids.includes(cb.value);
            });
        });
    });

});
