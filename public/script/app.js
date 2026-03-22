// ── TOAST AUTO-DISMISS ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.toast').forEach(function (t) {
        setTimeout(function () {
            t.style.transition = 'opacity .4s';
            t.style.opacity = '0';
            setTimeout(function () { t.remove(); }, 400);
        }, 3500);
    });
});
