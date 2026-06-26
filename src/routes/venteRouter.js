// ── venteRouter.js ────────────────────────────────────────────
// Routeur du module "Ventes".
// Toutes les routes exigent une connexion et un rôle ADMIN/SUPER_ADMIN ;
// seule la suppression d'une vente est réservée au SUPER_ADMIN.
// ──────────────────────────────────────────────────────────────
import { Router } from 'express';
import { authMiddleware, requireRole } from '../services/authMiddleware.js';
import { getVentes, getVenteDetail, postAddVente, postDeleteVente } from '../controllers/venteController.js';
const router = Router();
// GET /  → liste des ventes (ADMIN / SUPER_ADMIN)
router.get('/',            authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), getVentes);
// GET /:id  → détail d'une vente précise (ADMIN / SUPER_ADMIN)
router.get('/:id',         authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), getVenteDetail);
// POST /add  → enregistre une nouvelle vente (ADMIN / SUPER_ADMIN)
router.post('/add',        authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), postAddVente);
// POST /:id/delete  → supprime la vente :id (SUPER_ADMIN uniquement)
router.post('/:id/delete', authMiddleware, requireRole('SUPER_ADMIN'),          postDeleteVente);
export { router as venteRouter };
