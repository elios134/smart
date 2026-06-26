// ── userRouter.js ─────────────────────────────────────────────
// Routeur des comptes utilisateurs : connexion/déconnexion, profil et
// réinitialisation du mot de passe (oubli par email + changement direct).
// Les routes "Public" sont accessibles sans connexion mais protégées par
// des limiteurs anti brute-force / anti-spam ; les autres exigent une session.
// ──────────────────────────────────────────────────────────────
import { Router } from "express";
import { authMiddleware } from "../services/authMiddleware.js";
import { rateLimiter } from "../middleware/rateLimiter.js";
import {
    getLogin, postLogin, getLogout,
    getProfil, postUpdateProfil,
    getResetPassword, postResetPassword,
    getForgotPassword, postForgotPassword,
    getResetPasswordToken, postResetPasswordToken
} from "../controllers/userController.js";
import { getHome } from "../controllers/homeController.js";

const router = Router();

// Anti brute-force : 10 tentatives de connexion / 15 min / IP
const loginLimiter = rateLimiter({ key: "login", max: 10, windowMs: 15 * 60 * 1000, message: "Trop de tentatives de connexion. Réessayez dans 15 minutes." });
// Anti-spam email : 5 demandes de réinitialisation / heure / IP
const forgotLimiter = rateLimiter({ key: "forgot", max: 5, windowMs: 60 * 60 * 1000, message: "Trop de demandes. Réessayez plus tard." });

// Public — Auth
router.get("/login", getLogin);                      // affiche le formulaire de connexion
router.post("/login", loginLimiter, postLogin);       // traite la connexion (limiteur anti brute-force)
router.get("/logout", getLogout);                     // déconnecte l'utilisateur

// Public — Mot de passe oublié
router.get("/forgot-password", getForgotPassword);                          // formulaire "mot de passe oublié"
router.post("/forgot-password", forgotLimiter, postForgotPassword);          // envoie l'email de réinitialisation (limiteur anti-spam)
router.get("/reset-password/:token", getResetPasswordToken);                 // formulaire de nouveau mot de passe via le jeton reçu par email
router.post("/reset-password/:token", loginLimiter, postResetPasswordToken); // enregistre le nouveau mot de passe lié au jeton

// Tous les rôles authentifiés
router.get("/home", authMiddleware, getHome);                       // page d'accueil après connexion
router.get("/profil", authMiddleware, getProfil);                   // affiche le profil de l'utilisateur connecté
router.post("/profil", authMiddleware, postUpdateProfil);           // met à jour son profil
router.get("/reset-password", authMiddleware, getResetPassword);    // formulaire de changement de mot de passe (déjà connecté)
router.post("/reset-password", authMiddleware, postResetPassword);  // enregistre le nouveau mot de passe

export { router as userRouter };
