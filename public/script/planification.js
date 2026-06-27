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

    // ── FullCalendar ──────────────────────────────────────────
    var calendarEl = document.getElementById('calendar');
    if (calendarEl) {
        var eventsData = [];
        var raw = document.getElementById('calendar-events-data');
        if (raw) { try { eventsData = JSON.parse(raw.textContent); } catch (e) {} }
        var cal = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth', locale: 'fr', firstDay: 1,
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' },
            events: eventsData, height: 560, dayMaxEvents: 3,
            buttonText: { today: "Aujourd'hui", month: 'Mois', week: 'Semaine' }
        });
        cal.render();
    }

    // ── Modal Créer achat depuis session terminée ─────────────
    document.querySelectorAll('[data-modal-open="modal-creer-achat"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var sourceId  = btn.dataset.achatSourceId;
            var sourceNom = btn.dataset.achatSourceNom;
            var quantite  = btn.dataset.achatQuantite;
            var cout      = btn.dataset.achatCout;

            // Pré-remplir les champs
            var idInput  = document.getElementById('achat-source-id');
            var nomEl    = document.getElementById('achat-source-nom');
            var qteInput = document.getElementById('achat-quantite-input');
            var coutInput= document.getElementById('achat-cout-input');

            if (idInput)   idInput.value   = sourceId;
            if (nomEl)     nomEl.textContent = sourceNom;
            if (qteInput)  qteInput.value  = quantite;
            if (coutInput) coutInput.value  = cout;

            // Ouvrir la modale
            var modal = document.getElementById('modal-creer-achat');
            if (modal) modal.classList.add('open');
        });
    });

    // ── Fermeture modales (data-modal-close) ──────────────────
    document.querySelectorAll('[data-modal-close]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var id = btn.dataset.modalClose;
            var modal = document.getElementById(id);
            if (modal) modal.classList.remove('open');
        });
    });

    // ── Fermeture modales génériques (modals.js pattern) ─────
    document.querySelectorAll('[data-modal-open]').forEach(function (btn) {
        if (btn.dataset.modalOpen === 'modal-creer-achat') return; // déjà géré
        btn.addEventListener('click', function () {
            var id = btn.dataset.modalOpen;
            var modal = document.getElementById(id);
            if (!modal) return;

            // Remplir l'action du form si data-form et data-action présents
            if (btn.dataset.form && btn.dataset.action) {
                var form = document.getElementById(btn.dataset.form);
                if (form) form.action = btn.dataset.action;
            }

            // Remplir les champs via data-fields
            if (btn.dataset.fields) {
                try {
                    var fields = JSON.parse(btn.dataset.fields);
                    Object.entries(fields).forEach(function ([id, val]) {
                        var el = document.getElementById(id);
                        if (el) el.value = val;
                    });
                } catch (e) {}
            }

            // Remplir le texte de confirmation
            if (btn.dataset.confirmText && btn.dataset.confirmTarget) {
                var target = document.getElementById(btn.dataset.confirmTarget);
                if (target) target.textContent = btn.dataset.confirmText;
            }

            modal.classList.add('open');
        });
    });

    // Clic backdrop pour fermer
    document.querySelectorAll('.modal-backdrop').forEach(function (backdrop) {
        backdrop.addEventListener('click', function (e) {
            if (e.target === backdrop) backdrop.classList.remove('open');
        });
    });
});
