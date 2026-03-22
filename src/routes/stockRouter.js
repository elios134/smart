import { Router } from "express";
import { authMiddleware, requireRole } from "../services/authMiddleware.js";
import {
    getStock,
    postAddAchat,
    postLivreAchat,
    postDeleteAchat,
    postEditStockProduit,
    postDeleteStockProduit,
    postAddMatiere,
    postEditMatiere,
    postDeleteMatiere
} from "../controllers/stockController.js";

const router = Router();

// Consultation : tous les rôles
router.get("/",                         authMiddleware, getStock);
// Commandes MP : tous les rôles
router.post("/achats/add",              authMiddleware, postAddAchat);
router.post("/achats/:id/livre",        authMiddleware, postLivreAchat);
// Suppression commande + modification/suppression stock produit : ADMIN+
router.post("/achats/:id/delete",       authMiddleware, requireRole("SUPER_ADMIN", "ADMIN"), postDeleteAchat);
router.post("/produits/:id/edit",       authMiddleware, requireRole("SUPER_ADMIN", "ADMIN"), postEditStockProduit);
router.post("/produits/:id/delete",     authMiddleware, requireRole("SUPER_ADMIN", "ADMIN"), postDeleteStockProduit);
// Matières premières : ADMIN+
router.post("/matieres/add",            authMiddleware, requireRole("SUPER_ADMIN", "ADMIN"), postAddMatiere);
router.post("/matieres/:id/edit",       authMiddleware, requireRole("SUPER_ADMIN", "ADMIN"), postEditMatiere);
router.post("/matieres/:id/delete",     authMiddleware, requireRole("SUPER_ADMIN", "ADMIN"), postDeleteMatiere);

export { router as stockRouter };
