import prisma from "../../prisma/prismaClient.js";
import { validatePassword } from "../services/passwordValidator.js";

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
        const bcrypt = await import("bcryptjs");
        const employe = await prisma.user.findUnique({ where: { mail } });

        if (!employe || employe.role === "SUPER_ADMIN") {
            return res.redirect("/employes/login?error=Identifiants incorrects");
        }

        const valid = await bcrypt.default.compare(password, employe.password);
        if (!valid) {
            return res.redirect("/employes/login?error=Identifiants incorrects");
        }

        req.session.employe = { id: employe.id, mail: employe.mail, role: employe.role, firstName: employe.firstName, lastName: employe.lastName };
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

// GET /employes/home
export const getHomeEmploye = async (req, res) => {
    try {
        const produits = await prisma.produit.findMany({ include: { stock: true } });
        res.render("pages/homeEmploye.twig", {
            user: req.user,
            produits,
            flash: res.locals.flash
        });
    } catch (error) {
        console.error(error);
        res.redirect("/employes/login?error=Erreur serveur");
    }
};

// POST /employes/profil
export const postUpdateProfilEmploye = async (req, res) => {
    const { firstName, lastName, mail } = req.body;
    try {
        await prisma.user.update({
            where: { id: req.session.employe.id },
            data: { firstName, lastName, mail }
        });
        req.session.employe = { ...req.session.employe, firstName, lastName, mail };
        res.redirect("/employes/home?success=Profil mis à jour");
    } catch (error) {
        console.error(error);
        res.redirect("/employes/home?error=Erreur lors de la mise à jour");
    }
};

// POST /employes/add
export const postAddEmploye = async (req, res) => {
    const { firstName, lastName, mail, password, role } = req.body;
    try {
        const pwdCheck = validatePassword(password);
        if (!pwdCheck.valid) {
            return res.redirect("/home?error=" + encodeURIComponent(pwdCheck.message));
        }

        await prisma.user.create({
            data: { firstName, lastName, mail, password, role: role || "OPERATEUR" }
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
        await prisma.user.update({
            where: { id: parseInt(req.params.id) },
            data: { firstName, lastName, mail, role }
        });
        res.redirect("/home?success=Employé modifié");
    } catch (error) {
        console.error(error);
        res.redirect("/home?error=Erreur lors de la modification");
    }
};

// POST /employes/:id/delete
export const postDeleteEmploye = async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
        res.redirect("/home?success=Employé supprimé");
    } catch (error) {
        console.error(error);
        res.redirect("/home?error=Erreur lors de la suppression");
    }
};