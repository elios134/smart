// ── reportingRouter.js ────────────────────────────────────────
// Routeur du module "Reporting" (tableaux de bord / statistiques).
// Toutes les routes exigent une connexion (authMiddleware) ET un rôle
// élevé (requireRole : SUPER_ADMIN ou ADMIN) : ces données sont sensibles.
// ──────────────────────────────────────────────────────────────
import { Router } from 'express';
import { authMiddleware, requireRole } from '../services/authMiddleware.js';
import { getReporting, exportCSV, exportPDF } from '../controllers/reportingController.js';
const router = Router();
// GET /  → affiche la page de reporting (synthèse, graphiques)
router.get('/',              authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), getReporting);
// GET /export/csv  → télécharge les données du reporting au format CSV
router.get('/export/csv',   authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), exportCSV);
// GET /export/pdf  → télécharge les données du reporting au format PDF
router.get('/export/pdf',   authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), exportPDF);
export { router as reportingRouter };
