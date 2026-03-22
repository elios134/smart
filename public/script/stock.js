/**
 * SMART-YIELD — Stock JS
 * 
 * Filtrage croisé dynamique dans la modale de commande MP :
 * - Choisir un fournisseur → filtre les matières disponibles
 * - Choisir une matière → filtre les fournisseurs qui la vendent
 * - Pré-remplit le prix unitaire depuis le prix actuel de la matière
 */

document.addEventListener("DOMContentLoaded", () => {
    const dataEl = document.getElementById("liaison-data");
    if (!dataEl) return;

    const { f2m, m2f } = JSON.parse(dataEl.textContent);

    const selectFournisseur = document.getElementById("cmd-fournisseur");
    const selectMatiere = document.getElementById("cmd-matiere");
    const inputPrix = document.getElementById("cmd-prix");

    if (!selectFournisseur || !selectMatiere) return;

    // Sauvegarder toutes les options originales
    const allFournisseurOptions = Array.from(selectFournisseur.options).map(o => ({
        value: o.value,
        text: o.textContent,
    }));
    const allMatiereOptions = Array.from(selectMatiere.options).map(o => ({
        value: o.value,
        text: o.textContent,
        prix: o.dataset.prix || "",
    }));

    // ── Quand on choisit un fournisseur → filtrer les matières ──
    selectFournisseur.addEventListener("change", () => {
        const fId = selectFournisseur.value;
        const currentMatiere = selectMatiere.value;

        // Réinitialiser les options matière
        selectMatiere.innerHTML = "";

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Sélectionner une matière...";
        selectMatiere.appendChild(placeholder);

        const allowedMatieres = fId ? (f2m[fId] || []) : null;

        for (const opt of allMatiereOptions) {
            if (!opt.value) continue; // skip placeholder
            // Si un fournisseur est sélectionné, ne montrer que ses matières
            if (allowedMatieres && !allowedMatieres.includes(parseInt(opt.value))) continue;
            const o = document.createElement("option");
            o.value = opt.value;
            o.textContent = opt.text;
            o.dataset.prix = opt.prix;
            if (opt.value === currentMatiere) o.selected = true;
            selectMatiere.appendChild(o);
        }

        // Si aucune matière dispo pour ce fournisseur
        if (fId && selectMatiere.options.length === 1) {
            const empty = document.createElement("option");
            empty.value = "";
            empty.textContent = "— Aucune matière liée à ce fournisseur —";
            empty.disabled = true;
            selectMatiere.appendChild(empty);
        }
    });

    // ── Quand on choisit une matière → filtrer les fournisseurs ──
    selectMatiere.addEventListener("change", () => {
        const mId = selectMatiere.value;
        const currentFournisseur = selectFournisseur.value;

        // Pré-remplir le prix unitaire
        if (inputPrix && mId) {
            const selectedOption = selectMatiere.options[selectMatiere.selectedIndex];
            if (selectedOption && selectedOption.dataset.prix) {
                inputPrix.value = selectedOption.dataset.prix;
            }
        }

        // Réinitialiser les options fournisseur
        selectFournisseur.innerHTML = "";

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Sélectionner un fournisseur...";
        selectFournisseur.appendChild(placeholder);

        const allowedFournisseurs = mId ? (m2f[mId] || []) : null;

        for (const opt of allFournisseurOptions) {
            if (!opt.value) continue;
            if (allowedFournisseurs && !allowedFournisseurs.includes(parseInt(opt.value))) continue;
            const o = document.createElement("option");
            o.value = opt.value;
            o.textContent = opt.text;
            if (opt.value === currentFournisseur) o.selected = true;
            selectFournisseur.appendChild(o);
        }

        if (mId && selectFournisseur.options.length === 1) {
            const empty = document.createElement("option");
            empty.value = "";
            empty.textContent = "— Aucun fournisseur pour cette matière —";
            empty.disabled = true;
            selectFournisseur.appendChild(empty);
        }
    });

    // ── Reset quand la modale s'ouverte ──
    const modal = document.getElementById("modal-mp-add");
    if (modal) {
        const observer = new MutationObserver(() => {
            if (modal.classList.contains("open")) {
                selectFournisseur.value = "";
                selectMatiere.value = "";
                if (inputPrix) inputPrix.value = "";
                // Restaurer toutes les options
                selectFournisseur.dispatchEvent(new Event("change"));
            }
        });
        observer.observe(modal, { attributes: true, attributeFilter: ["class"] });
    }
});
