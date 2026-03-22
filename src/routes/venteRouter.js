import { Router } from "express";
import { authMiddleware, requireRole } from "../services/authMiddleware.js";
import {
    getVentes,
    postAddVente,
    getVenteDetail,
    postDeleteVente
} from "../controllers/venteController.js";

const router = Router();

// ADMIN + SUPER_ADMIN uniquement
router.get("/",            authMiddleware, requireRole("SUPER_ADMIN", "ADMIN"), getVentes);
router.post("/add",        authMiddleware, requireRole("SUPER_ADMIN", "ADMIN"), postAddVente);
router.get("/:id",         authMiddleware, requireRole("SUPER_ADMIN", "ADMIN"), getVenteDetail);
router.post("/:id/delete", authMiddleware, requireRole("SUPER_ADMIN", "ADMIN"), postDeleteVente);

export { router as venteRouter };
