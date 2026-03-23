document.addEventListener('DOMContentLoaded', function () {
    // 1. Gestion des Toasts (Disparition auto)
    document.querySelectorAll('.toast').forEach(function (t) {
        setTimeout(function () {
            t.style.transition = 'opacity .4s';
            t.style.opacity = '0';
            setTimeout(function () { t.remove(); }, 400);
        }, 3500);
    });

    // 2. Variables pour les mots de passe
    const champMdp = document.querySelector('input[name="password"]');
    const champConfirm = document.querySelector('input[name="password_confirm"]');
    const listeBoutons = document.querySelectorAll('.btn-toggle');
    const svgOeilOuvert = "../imgs/visibility-on.svg";
    const svgOeilFerme = "../imgs/visibility-off.svg";

    // 3. Logique de visibilité du mot de passe
    listeBoutons.forEach(function (bouton) {
        bouton.addEventListener('click', function () {
            const inputCible = this.previousElementSibling;

            if (inputCible.type === "password") {
                inputCible.type = "text";
                // On change l'icône via la variable CSS
                this.style.setProperty('--icon-url', `url('${svgOeilOuvert}')`);
            } else {
                inputCible.type = "password";
                this.style.setProperty('--icon-url', `url('${svgOeilFerme}')`);
            }
        });
    });

    // 4. Validation de correspondance des mots de passe
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

    // 5. Gestion de l'Avatar (Preview)
    const inputAvatar = document.getElementById('avatar');
    const previewAvatar = document.getElementById('preview-avatar');

    if (inputAvatar && previewAvatar) {
        inputAvatar.addEventListener('change', function () {
            const file = this.files[0];
            if (file) {
                // Utilisation de URL.createObjectURL (plus moderne et rapide que FileReader)
                previewAvatar.src = URL.createObjectURL(file);
            }
        });
    }
});