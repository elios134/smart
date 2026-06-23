import { Router } from "express";
import { authMiddleware, requireRole } from "../services/authMiddleware.js";
import { rateLimiter } from "../middleware/rateLimiter.js";
import {
    getLoginEmploye, postLoginEmploye, getLogoutEmploye, getHomeEmploye,
    postAddEmploye, postUpdateEmploye, postDeleteEmploye, postUpdateProfilEmploye
} from "../controllers/employeController.js";

const router = Router();

const loginLimiter = rateLimiter({ key: "login-employe", max: 10, windowMs: 15 * 60 * 1000, message: "Trop de tentatives de connexion. Réessayez dans 15 minutes." });

// Public
router.get("/login", getLoginEmploye);
router.post("/login", loginLimiter, postLoginEmploye);
router.get("/logout", getLogoutEmploye);

// Espace employé (ADMIN + OPERATEUR)
router.get("/home", authMiddleware, requireRole("ADMIN", "OPERATEUR"), getHomeEmploye);
router.post("/profil", authMiddleware, requireRole("ADMIN", "OPERATEUR"), postUpdateProfilEmploye);

// Gestion des employés — SUPER_ADMIN uniquement
router.post("/add", authMiddleware, requireRole("SUPER_ADMIN"), postAddEmploye);
router.post("/:id/edit", authMiddleware, requireRole("SUPER_ADMIN"), postUpdateEmploye);
router.post("/:id/delete", authMiddleware, requireRole("SUPER_ADMIN"), postDeleteEmploye);

export { router as employeRouter };
