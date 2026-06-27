// ── tabletools.js ─────────────────────────────────────────────
// Améliore les tableaux marqués `class="js-table"` : ajoute un champ de
// recherche au-dessus (filtre les lignes) et rend les en-têtes triables au clic.
// 100 % côté navigateur, aucune dépendance. Opt-in via la classe js-table.
// ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('table.js-table').forEach(function (table) {
        var tbody = table.tBodies[0];
        if (!tbody) return;

        // Lignes de données réelles (on ignore la ligne "empty-state").
        function dataRows() {
            return Array.prototype.filter.call(tbody.rows, function (r) {
                return !r.querySelector('.empty-state');
            });
        }

        // ── Recherche ──
        var search = document.createElement('input');
        search.type = 'search';
        search.className = 'form-input';
        search.placeholder = 'Rechercher…';
        search.setAttribute('aria-label', 'Rechercher dans le tableau');
        search.style.maxWidth = '260px';
        search.style.marginBottom = '14px';
        table.parentNode.insertBefore(search, table);
        search.addEventListener('input', function () {
            var q = search.value.trim().toLowerCase();
            dataRows().forEach(function (r) {
                r.style.display = (!q || r.textContent.toLowerCase().indexOf(q) !== -1) ? '' : 'none';
            });
        });

        // ── Tri par colonne (clic sur l'en-tête) ──
        var ths = table.tHead ? table.tHead.rows[0].cells : [];
        Array.prototype.forEach.call(ths, function (th, idx) {
            if (th.hasAttribute('data-nosort')) return;
            if (/action/i.test(th.textContent)) return; // pas de tri sur la colonne Actions
            th.style.cursor = 'pointer';
            th.title = 'Trier';
            var dir = 0;
            th.addEventListener('click', function () {
                dir = dir === 1 ? -1 : 1;
                var rows = dataRows();
                rows.sort(function (a, b) {
                    var x = cellVal(a, idx), y = cellVal(b, idx);
                    if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
                    return String(x).localeCompare(String(y), 'fr') * dir;
                });
                rows.forEach(function (r) { tbody.appendChild(r); });
            });
        });

        // Valeur d'une cellule : nombre si la cellule est numérique (unités ignorées), sinon texte.
        function cellVal(row, idx) {
            var cell = row.cells[idx];
            if (!cell) return '';
            var txt = cell.textContent.trim();
            var num = parseFloat(txt.replace(/[^0-9.,-]/g, '').replace(',', '.'));
            return (txt !== '' && !isNaN(num) && /[0-9]/.test(txt)) ? num : txt.toLowerCase();
        }
    });
});
