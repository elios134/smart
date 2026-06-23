import prisma from "../../prisma/prismaClient.js";
import bcrypt from "bcryptjs";
import { validatePassword } from "../services/passwordValidator.js";
import { invalidateUserCache } from "../services/authMiddleware.js";
import { isEmail, isOneOf, ROLES } from "../services/validators.js";

// GET /employes/login
export const getLoginEmploye = (req, res) => {
    res.render("pages/loginEmploye.twig", {
        flash: res.locals.flash
    });
};

// POST /employes/login
export const postLoginEmploye = async (req, res) => {
    const { mail, password } = req.body;
    try {
        const employe = await prisma.user.findUnique({ where: { mail } });

        if (!employe || employe.role === "SUPER_ADMIN") {
            return res.redirect("/employes/login?error=Identifiants incorrects");
        }

        const valid = await bcrypt.compare(password, employe.password);
        if (!valid) {
            return res.redirect("/employes/login?error=Identifiants incorrects");
        }

        // On ne stocke que l'id : les infos fraîches sont rechargées depuis la DB
        // par authMiddleware (évite une session obsolète après modification du profil).
        req.session.employe = employe.id;
        res.redirect("/home");
    } catch (error) {
        console.error(error);
        res.redirect("/employes/login?error=Erreur serveur");
    }
};

// GET /employes/logout
export const getLogoutEmploye = (req, res) => {
    req.session.destroy(() => res.redirect("/employes/login"));
};

// GET /employes/home → redirige vers /home (dashboard énergie unifié)
export const getHomeEmploye = async (req, res) => {
    res.redirect("/home");
};

// POST /employes/profil
export const postUpdateProfilEmploye = async (req, res) => {
    const { firstName, lastName, mail } = req.body;
    try {
        if (mail && !isEmail(mail)) return res.redirect("/profil?error=Adresse email invalide");

        await prisma.user.update({
            where: { id: req.user.id },
            data: { firstName, lastName, mail }
        });
        // Invalide le cache pour que les nouvelles infos soient rechargées
        invalidateUserCache(req.user.id);
        res.redirect("/profil?success=Profil mis à jour");
    } catch (error) {
        console.error(error);
        res.redirect("/profil?error=Erreur lors de la mise à jour");
    }
};

// POST /employes/add
export const postAddEmploye = async (req, res) => {
    const { firstName, lastName, mail, password, role } = req.body;
    try {
        if (!isEmail(mail)) return res.redirect("/home?error=" + encodeURIComponent("Adresse email invalide"));

        const pwdCheck = validatePassword(password);
        if (!pwdCheck.valid) {
            return res.redirect("/home?error=" + encodeURIComponent(pwdCheck.message));
        }

        const roleFinal = isOneOf(role, ["ADMIN", "OPERATEUR"]) ? role : "OPERATEUR";

        await prisma.user.create({
            data: { firstName, lastName, mail, password, role: roleFinal }
        });
        res.redirect("/home?success=Employé ajouté");
    } catch (error) {
        console.error(error);
        res.redirect("/home?error=Erreur lors de l'ajout");
    }
};

// POST /employes/:id/edit
export const postUpdateEmploye = async (req, res) => {
    const { firstName, lastName, mail, role } = req.body;
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.redirect("/home?error=Identifiant invalide");
        if (mail && !isEmail(mail)) return res.redirect("/home?error=" + encodeURIComponent("Adresse email invalide"));
        // On ne permet pas d'élever un employé au rang de SUPER_ADMIN via ce formulaire
        const roleFinal = isOneOf(role, ["ADMIN", "OPERATEUR"]) ? role : undefined;

        await prisma.user.update({
            where: { id },
            data: { firstName, lastName, mail, ...(roleFinal ? { role: roleFinal } : {}) }
        });
        // Le rôle a pu changer → on invalide le cache pour appliquer immédiatement
        invalidateUserCache(id);
        res.redirect("/home?success=Employé modifié");
    } catch (error) {
        console.error(error);
        res.redirect("/home?error=Erreur lors de la modification");
    }
};

// POST /employes/:id/delete
export const postDeleteEmploye = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.redirect("/home?error=Identifiant invalide");

        await prisma.user.delete({ where: { id } });
        invalidateUserCache(id);
        res.redirect("/home?success=Employé supprimé");
    } catch (error) {
        console.error(error);
        res.redirect("/home?error=Erreur lors de la suppression");
    }
};