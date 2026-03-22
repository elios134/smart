import { Router } from "express";
import { authMiddleware, requireRole } from "../services/authMiddleware.js";
import {
    getFournisseurs,
    postAddFournisseur,
    postEditFournisseur,
    postDeleteFournisseur
} from "../controllers/fournisseurController.js";

const router = Router();

// Consultation : tous les rôles
router.get("/",            authMiddleware, getFournisseurs);
// Écriture : ADMIN+ uniquement
router.post("/add",        authMiddleware, requireRole("SUPER_ADMIN", "ADMIN"), postAddFournisseur);
router.post("/:id/edit",   authMiddleware, requireRole("SUPER_ADMIN", "ADMIN"), postEditFournisseur);
router.post("/:id/delete", authMiddleware, requireRole("SUPER_ADMIN", "ADMIN"), postDeleteFournisseur);

export { router as fournisseurRouter };
