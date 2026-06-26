/**
 * Contrôleur d'initialisation du compte (setup).
 * Rôle : permettre la création du tout premier compte SUPER_ADMIN via un lien
 * sécurisé contenant un token à usage unique et à durée limitée.
 */
import prisma from "../../prisma/prismaClient.js";
import { validatePassword } from "../services/passwordValidator.js";
import { isEmail } from "../services/validators.js";

/** Renvoie le token de setup s'il est valide (non utilisé, non expiré), sinon null. */
async function getValidSetupToken(token) {
    const setupToken = await prisma.setupToken.findUnique({ where: { token } });
    if (!setupToken || setupToken.used || setupToken.expiresAt < new Date()) return null;
    return setupToken;
}

// GET /setup/:token
// Affiche le formulaire de création de compte si le token de l'URL est valide.
// Sinon, on affiche la page avec un message d'erreur (lien invalide/expiré).
export async function getSetup(req, res) {
    try {
        const { token } = req.params;
        const setupToken = await getValidSetupToken(token);

        if (!setupToken) {
            return res.render("pages/setup.twig", { title: "Création du compte", error: "Lien invalide ou expiré.", token: null });
        }

        res.render("pages/setup.twig", { title: "Création du compte", token, error: null });
    } catch (error) {
        console.error(error);
        res.render("pages/setup.twig", { title: "Création du compte", error: "Erreur serveur.", token: null });
    }
}

// POST /setup/:token
// Traite la soumission du formulaire : valide les données puis crée le compte.
// Étapes de contrôle (on réaffiche le formulaire avec un message à chaque échec) :
// token valide, email correct, mots de passe identiques et robustes, email/SIRET uniques.
export async function postSetup(req, res) {
    const { token } = req.params;
    try {
        const setupToken = await getValidSetupToken(token);

        if (!setupToken) {
            return res.render("pages/setup.twig", { title: "Création du compte", error: "Lien invalide ou expiré.", token: null });
        }

        const { mail, password, confirmPassword, firstName, lastName, socialReason, siret, directorName } = req.body;

        // Vérifie le format de l'adresse email.
        if (!isEmail(mail)) {
            return res.render("pages/setup.twig", { title: "Création du compte", error: "Adresse email invalide.", token });
        }

        // Les deux saisies du mot de passe doivent être identiques.
        if (password !== confirmPassword) {
            return res.render("pages/setup.twig", { title: "Création du compte", error: "Les mots de passe ne correspondent pas.", token });
        }

        // Vérifie la robustesse du mot de passe (longueur, complexité...).
        const pwdCheck = validatePassword(password);
        if (!pwdCheck.valid) {
            return res.render("pages/setup.twig", { title: "Création du compte", error: pwdCheck.message, token });
        }

        // Empêche les doublons : l'email doit être unique en base.
        const existingMail = await prisma.user.findUnique({ where: { mail } });
        if (existingMail) {
            return res.render("pages/setup.twig", { title: "Création du compte", error: "Cette adresse mail est déjà utilisée.", token });
        }

        // De même, le SIRET de l'entreprise doit être unique.
        const existingSiret = await prisma.user.findUnique({ where: { siret } });
        if (existingSiret) {
            return res.render("pages/setup.twig", { title: "Création du compte", error: "Ce SIRET est déjà enregistré.", token });
        }

        // Hash auto via hashPasswordExtension
        await prisma.user.create({
            data: {
                mail,
                password,
                role: "SUPER_ADMIN",
                firstName,
                lastName,
                socialReason,
                siret,
                directorName: directorName || null
            }
        });

        // On marque le token comme "utilisé" pour qu'il ne puisse plus servir.
        await prisma.setupToken.update({ where: { id: setupToken.id }, data: { used: true } });

        // Compte créé : on redirige vers la page de connexion avec un message de succès.
        res.redirect("/login?success=account_created");
    } catch (error) {
        console.error(error);
        res.render("pages/setup.twig", { title: "Création du compte", error: "Erreur serveur.", token });
    }
}