// ── app.js — utilitaires globaux (chargé sur toutes les pages) ──

// Espace de noms global léger + helpers partagés
window.SmartYield = window.SmartYield || {};

(function () {
    // Jeton CSRF lu depuis le <meta> du layout
    var meta = document.querySelector('meta[name="csrf-token"]');
    var csrf = meta ? meta.getAttribute('content') : '';
    window.SmartYield.csrfToken = csrf;

    // fetch sécurisé : ajoute automatiquement l'en-tête CSRF aux requêtes mutantes
    window.SmartYield.fetch = function (url, options) {
        options = options || {};
        var method = (options.method || 'GET').toUpperCase();
        if (method !== 'GET' && method !== 'HEAD') {
            options.headers = Object.assign({ 'X-CSRF-Token': csrf }, options.headers || {});
        }
        return fetch(url, options);
    };

    // Calcul de total (quantité × prix) — factorisé (utilisé par stock.js / ventes.js)
    window.SmartYield.calcTotal = function (qte, prix) {
        return ((parseFloat(qte) || 0) * (parseFloat(prix) || 0)).toFixed(2) + ' €';
    };

    // Injection auto du champ caché _csrf dans tous les formulaires POST
    // (couvre aussi les formulaires de modale dont l'action est définie dynamiquement)
    function injectCsrf() {
        document.querySelectorAll('form').forEach(function (form) {
            var method = (form.getAttribute('method') || 'get').toLowerCase();
            if (method !== 'post') return;
            if (form.querySelector('input[name="_csrf"]')) return;
            var input = document.createElement('input');
            input.type = 'hidden';
            input.name = '_csrf';
            input.value = csrf;
            form.appendChild(input);
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        injectCsrf();

        // 1. Toasts : accessibilité (annonce lecteur d'écran) + disparition auto
        document.querySelectorAll('.toast').forEach(function (t) {
            if (!t.getAttribute('role')) t.setAttribute('role', 'status');
            t.setAttribute('aria-live', 'polite');
            setTimeout(function () {
                t.style.transition = 'opacity .4s';
                t.style.opacity = '0';
                setTimeout(function () { t.remove(); }, 400);
            }, 3500);
        });

        // 2. Affichage/masquage des mots de passe
        var champMdp = document.querySelector('input[name="password"]');
        var champConfirm = document.querySelector('input[name="password_confirm"]');
        var listeBoutons = document.querySelectorAll('.btn-toggle');
        var svgOeilOuvert = "../imgs/visibility-on.svg";
        var svgOeilFerme = "../imgs/visibility-off.svg";

        listeBoutons.forEach(function (bouton) {
            bouton.addEventListener('click', function () {
                var inputCible = this.previousElementSibling;
                if (inputCible.type === "password") {
                    inputCible.type = "text";
                    this.style.setProperty('--icon-url', `url('${svgOeilOuvert}')`);
                    this.setAttribute('aria-label', 'Masquer le mot de passe');
                } else {
                    inputCible.type = "password";
                    this.style.setProperty('--icon-url', `url('${svgOeilFerme}')`);
                    this.setAttribute('aria-label', 'Afficher le mot de passe');
                }
            });
        });

        // 3. Validation de correspondance des mots de passe
        function validerMotsDePasse() {
            if (champMdp && champConfirm) {
                if (champMdp.value !== champConfirm.value) {
                    champConfirm.setCustomValidity("Les mots de passe ne sont pas identiques");
                } else {
                    champConfirm.setCustomValidity("");
                }
            }
        }
        if (champMdp && champConfirm) {
            champMdp.addEventListener('input', validerMotsDePasse);
            champConfirm.addEventListener('input', validerMotsDePasse);
        }

        // 4. Aperçu de l'avatar
        var inputAvatar = document.getElementById('avatar');
        var previewAvatar = document.getElementById('preview-avatar');
        if (inputAvatar && previewAvatar) {
            inputAvatar.addEventListener('change', function () {
                var file = this.files[0];
                if (file) previewAvatar.src = URL.createObjectURL(file);
            });
        }
    });
})();
