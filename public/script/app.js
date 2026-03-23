document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.toast').forEach(function (t) {
        setTimeout(function () {
            t.style.transition = 'opacity .4s';
            t.style.opacity = '0';
            setTimeout(function () { t.remove(); }, 400);
        }, 3500);
    });
});
const champMdp = document.querySelector('input[name="password"]');
const champConfirm = document.querySelector('input[name="password_confirm"]');
const listeBoutons = document.querySelectorAll('.btn-toggle');

const svgOeilOuvert = "../imgs/visibility-on.svg";
const svgOeilFerme = "../imgs/visibility-off.svg";

const inputAvatar = document.getElementById('avatar');
const previewAvatar = document.getElementById('preview-avatar');

document.addEventListener('DOMContentLoaded', function () {

    listeBoutons.forEach(function (bouton) {
        bouton.addEventListener('click', function () {

            const inputCible = this.previousElementSibling;

            if (inputCible.type === "password") {
                inputCible.type = "text";
                this.innerHTML = `<img src="${svgOeilOuvert}" alt="Masquer"">`
            } else {
                inputCible.type = "password";
                this.innerHTML = `<img src="${svgOeilFerme}" alt="Masquer">`;
            }
        });
    });
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
});

document.addEventListener('DOMContentLoaded', function () {
    if (inputAvatar) {
        inputAvatar.addEventListener('change', function () {
            const fichier = this.files[0]; 
            if (fichier) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    previewAvatar.src = e.target.result;
                };
                reader.readAsDataURL(fichier);
            }
        });
    }
});

 document.getElementById('avatar').onchange = function (evt) {
            const [file] = this.files
            if (file) {
                document.getElementById('preview-avatar').src = URL.createObjectURL(file)
            }
        }