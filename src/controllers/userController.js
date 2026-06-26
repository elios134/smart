/**
 * Contrôleur utilisateur (principalement le Super-Admin).
 * Rôle : gérer la connexion/déconnexion du Super-Admin, l'affichage et la mise à
 * jour de son profil, le changement de mot de passe depuis le profil, ainsi que
 * le parcours complet « mot de passe oublié » (génération d'un lien par email,
 * affichage du formulaire et réinitialisation via un token à usage unique).
 */
import prisma from "../../prisma/prismaClient.js";
import bcrypt from "bcryptjs"; // hachage et comparaison des mots de passe
import crypto from "crypto"; // génération d'un token aléatoire pour le lien de réinitialisation
import { sendResetPasswordEmail } from "../services/emailService.js";
import { validatePassword } from "../services/passwordValidator.js";
import { invalidateUserCache } from "../services/authMiddleware.js";
import { isEmail } from "../services/validators.js";

/** Charge un token de réinitialisation valide (non utilisé, non expiré) ou null. */
async function getValidResetToken(token) {
    const setupToken = await prisma.setupToken.findUnique({ where: { token } });
    if (!setupToken || setupToken.used || setupToken.expiresAt < new Date()) return null;
    return setupToken;
}

// GET /login
// Affiche la page de connexion du Super-Admin (si déjà connecté, va à /home).
export async function getLogin(req, res) {
    if (req.session.user) return res.redirect("/home");
    res.render("pages/login.twig", { title: "Connexion" });
}

// POST /login — authentification par mail
// Vérifie le mail et le mot de passe. Cet accès est réservé au Super-Admin :
// en cas d'échec on ré-affiche le login avec un message d'erreur générique.
export async function postLogin(req, res) {
    try {
        const { email: mail, password } = req.body;

        const user = await prisma.user.findUnique({ where: { mail } });
        if (!user) throw new Error("Mail introuvable");
        if (user.role !== "SUPER_ADMIN") throw new Error("Accès réservé au Super-Admin — utilisez /employes/login");

        if (!await bcrypt.compare(password, user.password)) throw new Error("Mot de passe invalide");

        // On ne garde que l'id en session ; le middleware rechargera les infos à jour.
        req.session.user = user.id;
        res.redirect("/home");
    } catch (error) {
        console.error(error);
        res.render("pages/login.twig", { title: "Connexion", error: "Identifiants invalides" });
    }
}

// GET /logout
// Détruit la session puis renvoie vers la page de connexion.
export async function getLogout(req, res) {
    req.session.destroy(() => {
        res.redirect("/login");
    });
}

// GET /profil
// Affiche la page de profil de l'utilisateur connecté (req.user fourni par le middleware).
export async function getProfil(req, res) {
    res.render("pages/profil.twig", { title: "Mon profil", user: req.user });
}

// POST /profil
// Met à jour les informations du profil (identité + raison sociale et directeur).
export async function postUpdateProfil(req, res) {
    try {
        const { firstName, lastName, mail, directorName, socialReason } = req.body;

        if (mail && !isEmail(mail)) return res.redirect("/profil?error=" + encodeURIComponent("Adresse email invalide"));

        await prisma.user.update({
            where: { id: req.user.id },
            data: { firstName, lastName, mail, directorName: directorName || null, socialReason }
        });

        // On invalide le cache pour que le middleware récupère les nouvelles infos à la prochaine page
        invalidateUserCache(req.user.id);

        res.redirect("/profil?success=profil_updated");
    } catch (error) {
        console.error(error);
        res.redirect("/profil?error=update_failed");
    }
}

// GET /reset-password (connecté — depuis le profil)
// Affiche le formulaire de changement de mot de passe pour l'utilisateur connecté.
export async function getResetPassword(req, res) {
    res.render("pages/resetPassword.twig", { title: "Réinitialiser le mot de passe" });
}

// POST /reset-password (connecté — depuis le profil)
// Change le mot de passe : vérifie la confirmation, la robustesse du nouveau MDP
// et l'exactitude du mot de passe actuel, puis enregistre la version hachée.
export async function postResetPassword(req, res) {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Le nouveau mot de passe et sa confirmation doivent être identiques.
        if (newPassword !== confirmPassword) return res.redirect("/reset-password?error=passwords_mismatch");
        const pwdCheck = validatePassword(newPassword);
        if (!pwdCheck.valid) return res.redirect("/reset-password?error=" + encodeURIComponent(pwdCheck.message));

        // On exige le mot de passe actuel pour confirmer l'identité avant le changement.
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!await bcrypt.compare(currentPassword, user.password)) {
            return res.redirect("/reset-password?error=wrong_password");
        }

        // On stocke toujours un hash, jamais le mot de passe en clair.
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({ where: { id: req.user.id }, data: { password: hashedPassword } });

        res.redirect("/profil?success=password_updated");
    } catch (error) {
        console.error(error);
        res.redirect("/reset-password?error=update_failed");
    }
}

// ═══════════════════════════════════════════════════════
// MOT DE PASSE OUBLIÉ (routes publiques)
// ═══════════════════════════════════════════════════════

// GET /forgot-password
// Affiche le formulaire public « mot de passe oublié ».
export async function getForgotPassword(req, res) {
    res.render("pages/forgotPassword.twig", { title: "Mot de passe oublié" });
}

// POST /forgot-password — génère token + envoie email
// Crée un token temporaire lié à l'utilisateur et lui envoie un lien de
// réinitialisation par email. Le message affiché reste identique que le mail
// existe ou non, afin de ne pas divulguer les comptes enregistrés.
export async function postForgotPassword(req, res) {
    try {
        const { mail } = req.body;

        const user = await prisma.user.findUnique({ where: { mail } });

        // Toujours afficher le même message (sécurité : ne pas révéler si le mail existe)
        const successMsg = "Si cette adresse existe, un email de réinitialisation a été envoyé.";

        if (!user) {
            return res.render("pages/forgotPassword.twig", {
                title: "Mot de passe oublié",
                success: successMsg,
            });
        }

        // Générer un token unique (valeur aléatoire impossible à deviner)
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // expire dans 1h

        // Sauvegarder le token lié à l'utilisateur
        await prisma.setupToken.create({
            data: { token, expiresAt, userId: user.id },
        });

        // URL du lien : APP_URL si défini, sinon la même origine que la requête (correct en dev sur :3506)
        const baseUrl = (process.env.APP_URL || "").trim() || `${req.protocol}://${req.get("host")}`;
        const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password/${token}`;

        // Envoyer l'email
        await sendResetPasswordEmail(mail, resetUrl);

        if (process.env.NODE_ENV !== "production") {
            console.warn("[dev] Lien réinitialisation copiable si la boîte mail ne reçoit rien :\n  ", resetUrl);
        }

        res.render("pages/forgotPassword.twig", {
            title: "Mot de passe oublié",
            success: successMsg,
        });
    } catch (error) {
        console.error("[forgot-password] Erreur :", error);
        res.render("pages/forgotPassword.twig", {
            title: "Mot de passe oublié",
            error: "Erreur lors de l'envoi. Veuillez réessayer.",
        });
    }
}

// GET /reset-password/:token — affiche le formulaire nouveau MDP
// Vérifie que le token du lien est valide ; si oui affiche le formulaire,
// sinon affiche un message indiquant que le lien est invalide ou expiré.
export async function getResetPasswordToken(req, res) {
    try {
        const { token } = req.params;
        const setupToken = await getValidResetToken(token);

        if (!setupToken) {
            return res.render("pages/resetPasswordToken.twig", {
                title: "Réinitialiser le mot de passe",
                error: "Ce lien est invalide ou a expiré.",
                token: null,
            });
        }

        res.render("pages/resetPasswordToken.twig", {
            title: "Réinitialiser le mot de passe",
            token,
            error: null,
        });
    } catch (error) {
        console.error(error);
        res.render("pages/resetPasswordToken.twig", {
            title: "Réinitialiser le mot de passe",
            error: "Erreur serveur.",
            token: null,
        });
    }
}

// POST /reset-password/:token — valide token + met à jour MDP
// Étape finale du « mot de passe oublié » : revalide le token, contrôle le
// nouveau mot de passe (confirmation + robustesse), enregistre le hash puis
// marque le token comme utilisé pour qu'il ne resserve pas.
export async function postResetPasswordToken(req, res) {
    const { token } = req.params;
    try {
        const setupToken = await getValidResetToken(token);

        if (!setupToken) {
            return res.render("pages/resetPasswordToken.twig", {
                title: "Réinitialiser le mot de passe",
                error: "Ce lien est invalide ou a expiré.",
                token: null,
            });
        }

        const { newPassword, confirmPassword } = req.body;

        if (newPassword !== confirmPassword) {
            return res.render("pages/resetPasswordToken.twig", {
                title: "Réinitialiser le mot de passe",
                error: "Les mots de passe ne correspondent pas.",
                token,
            });
        }

        const pwdCheck = validatePassword(newPassword);
        if (!pwdCheck.valid) {
            return res.render("pages/resetPasswordToken.twig", {
                title: "Réinitialiser le mot de passe",
                error: pwdCheck.message,
                token,
            });
        }

        if (!setupToken.userId) {
            return res.render("pages/resetPasswordToken.twig", {
                title: "Réinitialiser le mot de passe",
                error: "Ce lien est invalide ou incomplet.",
                token: null,
            });
        }

        const user = await prisma.user.findUnique({ where: { id: setupToken.userId } });
        if (!user) {
            return res.render("pages/resetPasswordToken.twig", {
                title: "Réinitialiser le mot de passe",
                error: "Utilisateur introuvable.",
                token,
            });
        }

        // Hash + update : on enregistre la version hachée du nouveau mot de passe.
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        // Marquer le token comme utilisé (un lien ne sert qu'une seule fois).
        await prisma.setupToken.update({
            where: { id: setupToken.id },
            data: { used: true },
        });

        res.redirect("/login?success=password_reset");
    } catch (error) {
        console.error(error);
        res.render("pages/resetPasswordToken.twig", {
            title: "Réinitialiser le mot de passe",
            error: "Erreur serveur.",
            token,
        });
    }
}