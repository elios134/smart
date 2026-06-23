import prisma from "../../prisma/prismaClient.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
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
export async function getLogin(req, res) {
    if (req.session.user) return res.redirect("/home");
    res.render("pages/login.twig", { title: "Connexion" });
}

// POST /login — authentification par mail
export async function postLogin(req, res) {
    try {
        const { email: mail, password } = req.body;

        const user = await prisma.user.findUnique({ where: { mail } });
        if (!user) throw new Error("Mail introuvable");
        if (user.role !== "SUPER_ADMIN") throw new Error("Accès réservé au Super-Admin — utilisez /employes/login");

        if (!await bcrypt.compare(password, user.password)) throw new Error("Mot de passe invalide");

        req.session.user = user.id;
        res.redirect("/home");
    } catch (error) {
        console.error(error);
        res.render("pages/login.twig", { title: "Connexion", error: "Identifiants invalides" });
    }
}

// GET /logout
export async function getLogout(req, res) {
    req.session.destroy(() => {
        res.redirect("/login");
    });
}

// GET /profil
export async function getProfil(req, res) {
    res.render("pages/profil.twig", { title: "Mon profil", user: req.user });
}

// POST /profil
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
export async function getResetPassword(req, res) {
    res.render("pages/resetPassword.twig", { title: "Réinitialiser le mot de passe" });
}

// POST /reset-password (connecté — depuis le profil)
export async function postResetPassword(req, res) {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (newPassword !== confirmPassword) return res.redirect("/reset-password?error=passwords_mismatch");
        const pwdCheck = validatePassword(newPassword);
        if (!pwdCheck.valid) return res.redirect("/reset-password?error=" + encodeURIComponent(pwdCheck.message));

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!await bcrypt.compare(currentPassword, user.password)) {
            return res.redirect("/reset-password?error=wrong_password");
        }

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
export async function getForgotPassword(req, res) {
    res.render("pages/forgotPassword.twig", { title: "Mot de passe oublié" });
}

// POST /forgot-password — génère token + envoie email
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

        // Générer un token unique
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

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

        // Hash + update
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        // Marquer le token comme utilisé
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