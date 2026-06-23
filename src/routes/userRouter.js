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
router.get("/login", getLogin);
router.post("/login", loginLimiter, postLogin);
router.get("/logout", getLogout);

// Public — Mot de passe oublié
router.get("/forgot-password", getForgotPassword);
router.post("/forgot-password", forgotLimiter, postForgotPassword);
router.get("/reset-password/:token", getResetPasswordToken);
router.post("/reset-password/:token", loginLimiter, postResetPasswordToken);

// Tous les rôles authentifiés
router.get("/home", authMiddleware, getHome);
router.get("/profil", authMiddleware, getProfil);
router.post("/profil", authMiddleware, postUpdateProfil);
router.get("/reset-password", authMiddleware, getResetPassword);
router.post("/reset-password", authMiddleware, postResetPassword);

export { router as userRouter };
