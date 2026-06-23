const PASSWORD_RULES = "Min. 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial";

/**
 * Valide un mot de passe
 * @param {string} password
 * @returns {{ valid: boolean, message: string|null }}
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
