// ── validators.js ─────────────────────────────────────────────
// Helpers de validation/normalisation des entrées (côté serveur).
// Centralise les conversions numériques sûres et la validation des enums,
// pour ne plus dépendre de `parseFloat(x) || 0` silencieux dans les controllers.
// ──────────────────────────────────────────────────────────────

// Listes des valeurs autorisées (enums) réutilisées dans les schémas de validation
// et dans les formulaires, pour garantir qu'on n'accepte que des valeurs connues.
export const TYPES_SOURCE = ["EOLIEN", "SOLAIRE", "HYDRAULIQUE", "HYDROGENE", "RESEAU"];
export const TYPES_TIERS = ["FOURNISSEUR", "CLIENT"];
export const STATUTS_ACTIF = ["ACTIF", "INACTIF"];
export const ROLES = ["SUPER_ADMIN", "ADMIN", "OPERATEUR"];

/** Entier strictement positif, sinon null. */
export function toInt(value) {
  const n = parseInt(value, 10);
  return Number.isInteger(n) ? n : null;
}

/** Nombre ≥ 0 fini, sinon null (rejette NaN, négatifs, Infinity). */
export function toPositiveFloat(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Vrai si la valeur appartient à la liste autorisée. */
export function isOneOf(value, allowed) {
  return allowed.includes(value);
}

/** Email basique (présence d'un @ et d'un domaine). */
export function isEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Chaîne non vide après trim. */
export function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Valide un jeu de champs selon un schéma simple.
 * Pour chaque champ décrit dans le schéma, on contrôle qu'il est présent (si requis)
 * et conforme à son type (int, float, enum, email…), puis on stocke la valeur nettoyée.
 * @param {object} body — les données reçues (ex: req.body)
 * @param {object} schema — description des champs : { champ: { type, required, label, min, values, default } }
 * @returns {{ ok: boolean, errors: string[], data: object }} ok=true si aucune erreur ;
 *          errors liste les messages ; data contient les valeurs validées et converties
 */
export function validate(body, schema) {
  const errors = [];
  const data = {};
  for (const [field, rule] of Object.entries(schema)) {
    const raw = body[field];

    if (rule.required && !nonEmpty(raw)) {
      errors.push(`${rule.label || field} est requis.`);
      continue;
    }
    if (!rule.required && (raw === undefined || raw === "" || raw === null)) {
      data[field] = rule.default ?? null;
      continue;
    }

    switch (rule.type) {
      case "int": {
        const v = toInt(raw);
        if (v === null) { errors.push(`${rule.label || field} doit être un entier.`); break; }
        if (rule.min != null && v < rule.min) { errors.push(`${rule.label || field} doit être ≥ ${rule.min}.`); break; }
        data[field] = v;
        break;
      }
      case "float": {
        const v = toPositiveFloat(raw);
        if (v === null) { errors.push(`${rule.label || field} doit être un nombre positif.`); break; }
        data[field] = v;
        break;
      }
      case "enum": {
        if (!isOneOf(raw, rule.values)) { errors.push(`${rule.label || field} invalide.`); break; }
        data[field] = raw;
        break;
      }
      case "email": {
        if (!isEmail(raw)) { errors.push(`${rule.label || field} n'est pas un email valide.`); break; }
        data[field] = raw.trim();
        break;
      }
      default:
        data[field] = typeof raw === "string" ? raw.trim() : raw;
    }
  }
  return { ok: errors.length === 0, errors, data };
}
