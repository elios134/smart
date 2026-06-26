// ── stockRouter.js ────────────────────────────────────────────
// Routeur du module "Stock" (achats et ajustements de stock).
// Consultation ouverte à tout utilisateur connecté ; les opérations qui
// modifient le stock demandent un rôle ADMIN/SUPER_ADMIN, et la suppression
// d'un achat est réservée au SUPER_ADMIN.
// ──────────────────────────────────────────────────────────────
import { Router } from 'express';
import { authMiddleware, requireRole } from '../services/authMiddleware.js';
import { getStock, postAddAchat, postDeleteAchat, postAjusterStock } from '../controllers/stockController.js';
const router = Router();
// GET /  → affiche l'état du stock (tout utilisateur connecté)
router.get('/',                        authMiddleware, getStock);
// POST /achats/add  → enregistre un nouvel achat (ADMIN / SUPER_ADMIN)
router.post('/achats/add',             authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), postAddAchat);
// POST /achats/:id/delete  → supprime l'achat :id (SUPER_ADMIN uniquement)
router.post('/achats/:id/delete',      authMiddleware, requireRole('SUPER_ADMIN'), postDeleteAchat);
// POST /ajuster/:sourceId  → ajuste manuellement le stock d'une source (ADMIN / SUPER_ADMIN)
router.post('/ajuster/:sourceId',      authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), postAjusterStock);
export { router as stockRouter };
