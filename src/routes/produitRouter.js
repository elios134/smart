import { Router } from "express";
import { authMiddleware, requireRole } from "../services/authMiddleware.js";
import { getProduits, postAddProduit, postEditProduit, postDeleteProduit } from "../controllers/produitController.js";

const router = Router();

// Consultation : tous les rôles
router.get("/",           authMiddleware, getProduits);
// Ajout : tous les rôles (opérateur peut ajouter des références)
router.post("/add",       authMiddleware, postAddProduit);
// Modification / Suppression : ADMIN+ uniquement
router.post("/:id/edit",  authMiddleware, requireRole("SUPER_ADMIN", "ADMIN"), postEditProduit);
router.post("/:id/delete",authMiddleware, requireRole("SUPER_ADMIN", "ADMIN"), postDeleteProduit);

export { router as produitRouter };
