import { Router } from "express";
import { getSetup, postSetup } from "../controllers/setupController.js";

const router = Router();

router.get("/setup/:token", getSetup);
router.post("/setup/:token", postSetup);

export { router as setupRouter };
