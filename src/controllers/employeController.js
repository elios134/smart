/**
 * Contrôleur des employés (ADMIN / OPERATEUR).
 * Rôle : gérer la connexion/déconnexion des employés, la mise à jour de leur
 * profil, ainsi que l'ajout, la modification et la suppression d'employés par
 * le Super-Admin. Chaque fonction reçoit la requête HTTP (req) et la réponse
 * (res), interroge la base via Prisma, puis redirige vers une page ou affiche
 * une vue Twig avec un message de succès/erreur.
 */
import prisma from "../../prisma/prismaClient.js";
import bcrypt from "bcryptjs"; // pour comparer le mot de passe saisi avec le hash stocké
import { validatePassword } from "../services/passwordValidator.js"; // vérifie la robustesse d'un mot de passe
import { invalidateUserCache } from "../services/authMiddleware.js"; // force le rechargement des infos utilisateur
import { isEmail, isOneOf, ROLES } from "../services/validators.js"; // petites fonctions de validation réutilisables

// GET /employes/login
// Affiche le formulaire de connexion des employés (rien à calculer, on rend juste la vue).
export const getLoginEmploye = (req, res) => {
    res.render("pages/loginEmploye.twig", {
        flash: res.locals.flash
    });
};

// POST /employes/login
// Vérifie les identifiants (mail + mot de passe) envoyés par le formulaire.
// Si tout est correct, ouvre la session de l'employé et l'envoie vers /home ;
// sinon, redirige vers le login avec un message d'erreur.
export const postLoginEmploye = async (req, res) => {
    const { mail, password } = req.body;
    try {
        // On cherche l'employé par son adresse mail (identifiant unique en base).
        const employe = await prisma.user.findUnique({ where: { mail } });

        // Refus si l'employé n'existe pas, ou s'il s'agit du Super-Admin
        // (le Super-Admin a son propre point d'entrée /login).
        if (!employe || employe.role === "SUPER_ADMIN") {
            return res.redirect("/employes/login?error=Identifiants incorrects");
        }

        // bcrypt.compare compare le mot de passe saisi au hash enregistré.
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
// Détruit la session en cours puis renvoie l'employé vers la page de connexion.
export const getLogoutEmploye = (req, res) => {
    req.session.destroy(() => res.redirect("/employes/login"));
};

// GET /employes/home → redirige vers /home (dashboard énergie unifié)
export const getHomeEmploye = async (req, res) => {
    res.redirect("/home");
};

// POST /employes/profil
// Met à jour les informations personnelles de l'employé connecté
// (prénom, nom, mail) à partir du formulaire de profil.
export const postUpdateProfilEmploye = async (req, res) => {
    const { firstName, lastName, mail } = req.body;
    try {
        // On valide le format du mail avant toute écriture en base.
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
// Crée un nouvel employé (réservé au Super-Admin depuis le dashboard).
// Valide le mail et le mot de passe, force un rôle autorisé, puis enregistre.
export const postAddEmploye = async (req, res) => {
    const { firstName, lastName, mail, password, role } = req.body;
    try {
        if (!isEmail(mail)) return res.redirect("/home?error=" + encodeURIComponent("Adresse email invalide"));

        // Vérifie que le mot de passe respecte les règles de sécurité.
        const pwdCheck = validatePassword(password);
        if (!pwdCheck.valid) {
            return res.redirect("/home?error=" + encodeURIComponent(pwdCheck.message));
        }

        // Sécurité : on n'accepte que ADMIN ou OPERATEUR, sinon OPERATEUR par défaut.
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
// Modifie un employé existant identifié par son id dans l'URL.
// Le rôle n'est mis à jour que s'il est valide (jamais SUPER_ADMIN).
export const postUpdateEmploye = async (req, res) => {
    const { firstName, lastName, mail, role } = req.body;
    try {
        // L'id arrive en texte dans l'URL : on le convertit en nombre et on vérifie qu'il est valide.
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
// Supprime définitivement un employé identifié par son id, puis vide son cache.
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