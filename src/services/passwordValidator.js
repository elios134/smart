// ── passwordValidator.js ──────────────────────────────────────
// Vérifie qu'un mot de passe respecte les règles de sécurité de l'application.
// Sert à la fois à l'inscription et au changement de mot de passe pour
// imposer un minimum de robustesse (longueur + variété de caractères).
// ──────────────────────────────────────────────────────────────

// Texte affiché à l'utilisateur pour lui rappeler les règles attendues.
const PASSWORD_RULES = "Min. 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial";

/**
 * Valide un mot de passe selon les règles de sécurité.
 * On teste chaque règle l'une après l'autre et on s'arrête à la première qui échoue,
 * afin de renvoyer un message d'erreur précis à l'utilisateur.
 * @param {string} password — le mot de passe à vérifier
 * @returns {{ valid: boolean, message: string|null }} valid=true si tout est bon,
 *          sinon message contient l'explication de l'échec
 */
export function validatePassword(password) {
    if (!password || password.length < 8) {
        return { valid: false, message: "Le mot de passe doit contenir au moins 8 caractères." };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, message: "Le mot de passe doit contenir au moins 1 lettre minuscule." };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: "Le mot de passe doit contenir au moins 1 lettre majuscule." };
    }
    if (!/\d/.test(password)) {
        return { valid: false, message: "Le mot de passe doit contenir au moins 1 chiffre." };
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
        return { valid: false, message: "Le mot de passe doit contenir au moins 1 caractère spécial." };
    }
    return { valid: true, message: null };
}

export { PASSWORD_RULES };
