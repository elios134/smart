import { Router } from "express";
import { authMiddleware } from "../services/authMiddleware.js";
import {
    getLogin, postLogin, getLogout,
    getProfil, postUpdateProfil,
    getResetPassword, postResetPassword,
    getForgotPassword, postForgotPassword,
    getResetPasswordToken, postResetPasswordToken
} from "../controllers/userController.js";
import { getHome } from "../controllers/homeController.js";

const router = Router();

// Public — Auth
router.get("/login", getLogin);
router.post("/login", postLogin);
router.get("/logout", getLogout);

// Public — Mot de passe oublié
router.get("/forgot-password", getForgotPassword);
router.post("/forgot-password", postForgotPassword);
router.get("/reset-password/:token", getResetPasswordToken);
router.post("/reset-password/:token", postResetPasswordToken);

// Tous les rôles authentifiés
router.get("/home", authMiddleware, getHome);
router.get("/profil", authMiddleware, getProfil);
router.post("/profil", authMiddleware, postUpdateProfil);
router.get("/reset-password", authMiddleware, getResetPassword);
router.post("/reset-password", authMiddleware, postResetPassword);

export { router as userRouter };
