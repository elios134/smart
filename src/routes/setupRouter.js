// ── setupRouter.js ────────────────────────────────────────────
// Routeur d'initialisation de compte via un lien à usage unique.
// L'accès se fait par un :token secret (et non par une connexion) : c'est
// ce jeton qui prouve l'identité, il n'y a donc pas d'authMiddleware ici.
// ──────────────────────────────────────────────────────────────
import { Router } from "express";
import { rateLimiter } from "../middleware/rateLimiter.js";
import { getSetup, postSetup } from "../controllers/setupController.js";

const router = Router();

// Limiteur anti brute-force : max 10 tentatives / 15 min / IP sur la validation du jeton
const setupLimiter = rateLimiter({ key: "setup", max: 10, windowMs: 15 * 60 * 1000, message: "Trop de tentatives. Réessayez plus tard." });

// GET /setup/:token  → affiche le formulaire d'initialisation lié au jeton
router.get("/setup/:token", getSetup);
// POST /setup/:token  → enregistre le mot de passe choisi (protégé par le limiteur)
router.post("/setup/:token", setupLimiter, postSetup);

export { router as setupRouter };
