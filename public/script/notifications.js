(function () {
    var bell      = document.getElementById('notif-bell');
    var panel     = document.getElementById('notif-panel');
    var countEl   = document.getElementById('notif-count');
    var listEl    = document.getElementById('notif-list');
    var clearBtn  = document.getElementById('notif-clear');
    if (!bell) return;

    function renderNotifications(notifs) {
        if (!notifs.length) {
            listEl.innerHTML = '<p class="notif-empty">Aucune notification</p>';
            countEl.style.display = 'none';
            return;
        }
        countEl.textContent = notifs.length;
        countEl.style.display = '';
        listEl.innerHTML = notifs.map(function (n) {
            var icon = n.type === 'production' ? '⚡' : '💰';
            var d    = new Date(n.at).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
            return '<div class="notif-item notif-item--' + n.type + '">'
                + '<span class="notif-item__icon">' + icon + '</span>'
                + '<div class="notif-item__body">'
                + '<div class="notif-item__msg">' + n.message + '</div>'
                + '<div class="notif-item__time">' + d + '</div>'
                + '</div></div>';
        }).join('');
    }

    function fetchNotifications() {
        fetch('/energie/notifications')
            .then(function (r) { return r.json(); })
            .then(renderNotifications)
            .catch(function (err) { console.warn('[notifications] chargement impossible :', err); });
    }

    bell.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = panel.style.display !== 'none';
        panel.style.display = open ? 'none' : '';
        if (!open) fetchNotifications();
    });

    document.addEventListener('click', function (e) {
        if (!bell.contains(e.target) && !panel.contains(e.target)) {
            panel.style.display = 'none';
        }
    });

    clearBtn.addEventListener('click', function () {
        window.SmartYield.fetch('/energie/notifications/clear', { method: 'POST' })
            .then(function () { renderNotifications([]); })
            .catch(function (err) { console.warn('[notifications] effacement impossible :', err); });
    });

    // Chargement initial + polling de secours toutes les 5 minutes.
    fetchNotifications();
    setInterval(fetchNotifications, 5 * 60 * 1000);

    // Push temps réel via SSE : on recharge la liste dès qu'une notification arrive
    // (le navigateur reconnecte tout seul ; le polling ci-dessus reste un filet).
    try {
        var es = new EventSource('/energie/notifications/stream');
        es.addEventListener('notif', function () { fetchNotifications(); });
    } catch (e) { /* EventSource indisponible → le polling suffit. */ }
})();
