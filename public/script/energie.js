document.addEventListener('DOMContentLoaded', function () {
    // ── Onglets ───────────────────────────────────────────────
    document.querySelectorAll('[data-tab]').forEach(function (tab) {
        tab.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelectorAll('[data-tab]').forEach(function (t) { t.classList.remove('active'); });
            document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
            tab.classList.add('active');
            var panel = document.getElementById('tab-' + tab.dataset.tab);
            if (panel) panel.classList.add('active');
        });
    });

    // ── Pré-remplissage checkbox Actif dans modal édition source ──
    document.querySelectorAll('[data-modal-open="modal-source-edit"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var actifCheckbox = document.getElementById('edit-s-actif');
            if (actifCheckbox) {
                actifCheckbox.checked = btn.dataset.actif === '1';
            }
        });
    });
});
