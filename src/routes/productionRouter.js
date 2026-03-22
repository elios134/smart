import { Router } from "express";
import { authMiddleware, requireRole } from "../services/authMiddleware.js";
import {
    getProduction,
    postAddProduction,
    postDeleteProduction,
    postLancerProduction,
    postTerminerProduction
} from "../controllers/productionController.js";

const router = Router();

// Tous les rôles : consultation, ajout, activation, arrêt
router.get("/",              authMiddleware, getProduction);
router.post("/add",          authMiddleware, postAddProduction);
router.post("/:id/delete",   authMiddleware, requireRole("SUPER_ADMIN", "ADMIN"), postDeleteProduction);
router.post("/:id/lancer",   authMiddleware, postLancerProduction);
router.post("/:id/terminer", authMiddleware, postTerminerProduction);

export { router as productionRouter };