import { Router } from "express";
import { authMiddleware, requireRole } from "../services/authMiddleware.js";
import {
    getLoginEmploye, postLoginEmploye, getLogoutEmploye, getHomeEmploye,
    postAddEmploye, postUpdateEmploye, postDeleteEmploye, postUpdateProfilEmploye
} from "../controllers/employeController.js";

const router = Router();

// Public
router.get("/login", getLoginEmploye);
router.post("/login", postLoginEmploye);
router.get("/logout", getLogoutEmploye);

// Espace employé (ADMIN + OPERATEUR)
router.get("/home", authMiddleware, requireRole("ADMIN", "OPERATEUR"), getHomeEmploye);
router.post("/profil", authMiddleware, requireRole("ADMIN", "OPERATEUR"), postUpdateProfilEmploye);

// Gestion des employés — SUPER_ADMIN uniquement
router.post("/add", authMiddleware, requireRole("SUPER_ADMIN"), postAddEmploye);
router.post("/:id/edit", authMiddleware, requireRole("SUPER_ADMIN"), postUpdateEmploye);
router.post("/:id/delete", authMiddleware, requireRole("SUPER_ADMIN"), postDeleteEmploye);

export { router as employeRouter };
