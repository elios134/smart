import { Router } from "express";
import { rateLimiter } from "../middleware/rateLimiter.js";
import { getSetup, postSetup } from "../controllers/setupController.js";

const router = Router();

const setupLimiter = rateLimiter({ key: "setup", max: 10, windowMs: 15 * 60 * 1000, message: "Trop de tentatives. Réessayez plus tard." });

router.get("/setup/:token", getSetup);
router.post("/setup/:token", setupLimiter, postSetup);

export { router as setupRouter };
