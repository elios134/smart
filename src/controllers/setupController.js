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
export async function postSetup(req, res) {
    const { token } = req.params;
    try {
        const setupToken = await getValidSetupToken(token);

        if (!setupToken) {
            return res.render("pages/setup.twig", { title: "Création du compte", error: "Lien invalide ou expiré.", token: null });
        }

        const { mail, password, confirmPassword, firstName, lastName, socialReason, siret, directorName } = req.body;

        if (!isEmail(mail)) {
            return res.render("pages/setup.twig", { title: "Création du compte", error: "Adresse email invalide.", token });
        }

        if (password !== confirmPassword) {
            return res.render("pages/setup.twig", { title: "Création du compte", error: "Les mots de passe ne correspondent pas.", token });
        }

        const pwdCheck = validatePassword(password);
        if (!pwdCheck.valid) {
            return res.render("pages/setup.twig", { title: "Création du compte", error: pwdCheck.message, token });
        }

        const existingMail = await prisma.user.findUnique({ where: { mail } });
        if (existingMail) {
            return res.render("pages/setup.twig", { title: "Création du compte", error: "Cette adresse mail est déjà utilisée.", token });
        }

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

        await prisma.setupToken.update({ where: { id: setupToken.id }, data: { used: true } });

        res.redirect("/login?success=account_created");
    } catch (error) {
        console.error(error);
        res.render("pages/setup.twig", { title: "Création du compte", error: "Erreur serveur.", token });
    }
}