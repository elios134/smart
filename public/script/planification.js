document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.page-tab').forEach(function (tab) {
        tab.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelectorAll('.page-tab').forEach(function (t) { t.classList.remove('active'); });
            document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
            tab.classList.add('active');
            var panel = document.getElementById('tab-' + tab.dataset.tab);
            if (panel) panel.classList.add('active');
        });
    });

    var calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    var eventsData = [];
    var raw = document.getElementById('calendar-events-data');
    if (raw) { try { eventsData = JSON.parse(raw.textContent); } catch (e) {} }
    var cal = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek', locale: 'fr',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
        events: eventsData, height: 520,
        buttonText: { today: "Aujourd'hui", month: 'Mois', week: 'Semaine' }
    });
    cal.render();
});
