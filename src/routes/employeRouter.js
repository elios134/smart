// ── employeRouter.js ──────────────────────────────────────────
// Routeur de l'espace "Employé" : connexion dédiée des employés, accueil
// de leur espace personnel, et gestion des comptes employés.
// 3 niveaux d'accès : routes publiques (login/logout), espace employé
// (ADMIN + OPERATEUR), et administration des employés (SUPER_ADMIN seul).
// ──────────────────────────────────────────────────────────────
import { Router } from "express";
import { authMiddleware, requireRole } from "../services/authMiddleware.js";
import { rateLimiter } from "../middleware/rateLimiter.js";
import {
    getLoginEmploye, postLoginEmploye, getLogoutEmploye, getHomeEmploye,
    postAddEmploye, postUpdateEmploye, postDeleteEmploye, postUpdateProfilEmploye
} from "../controllers/employeController.js";

const router = Router();

// Anti brute-force : 10 tentatives de connexion / 15 min / IP sur le login employé
const loginLimiter = rateLimiter({ key: "login-employe", max: 10, windowMs: 15 * 60 * 1000, message: "Trop de tentatives de connexion. Réessayez dans 15 minutes." });

// Public
router.get("/login", getLoginEmploye);                       // affiche le formulaire de connexion employé
router.post("/login", loginLimiter, postLoginEmploye);        // traite la connexion (protégé par le limiteur)
router.get("/logout", getLogoutEmploye);                      // déconnecte l'employé

// Espace employé (ADMIN + OPERATEUR)
router.get("/home", authMiddleware, requireRole("ADMIN", "OPERATEUR"), getHomeEmploye);              // page d'accueil de l'employé
router.post("/profil", authMiddleware, requireRole("ADMIN", "OPERATEUR"), postUpdateProfilEmploye);  // mise à jour de son propre profil

// Gestion des employés — SUPER_ADMIN uniquement
router.post("/add", authMiddleware, requireRole("SUPER_ADMIN"), postAddEmploye);          // crée un employé
router.post("/:id/edit", authMiddleware, requireRole("SUPER_ADMIN"), postUpdateEmploye);  // modifie l'employé :id
router.post("/:id/delete", authMiddleware, requireRole("SUPER_ADMIN"), postDeleteEmploye);// supprime l'employé :id

export { router as employeRouter };
