import { Router } from "express";
import { authMiddleware, requireRole } from "../services/authMiddleware.js";
import {
    getReporting,
    postAddSeuil,
    postDeleteSeuil
} from "../controllers/reportingController.js";

const router = Router();

// ADMIN + SUPER_ADMIN uniquement
router.get("/",                    authMiddleware, requireRole("SUPER_ADMIN", "ADMIN"), getReporting);
router.post("/seuils/add",         authMiddleware, requireRole("SUPER_ADMIN", "ADMIN"), postAddSeuil);
router.post("/seuils/:id/delete",  authMiddleware, requireRole("SUPER_ADMIN", "ADMIN"), postDeleteSeuil);

export { router as reportingRouter };
