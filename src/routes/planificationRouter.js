// ── planificationRouter.js ────────────────────────────────────
// Routeur du module "Planification" (sessions de travail/production).
// La consultation et la gestion du cycle de vie d'une session (créer,
// lancer, terminer) sont accessibles à tout utilisateur connecté ;
// seule la suppression d'une session demande un rôle ADMIN/SUPER_ADMIN.
// ──────────────────────────────────────────────────────────────
import { Router } from 'express';
import { authMiddleware, requireRole } from '../services/authMiddleware.js';
import { getPlanification, postAddSession, postLancerSession, postTerminerSession, postDeleteSession } from '../controllers/planificationController.js';
const router = Router();
// GET /  → affiche le planning des sessions (tout utilisateur connecté)
router.get('/',              authMiddleware, getPlanification);
// POST /add  → crée une nouvelle session planifiée
router.post('/add',          authMiddleware, postAddSession);
// POST /:id/lancer  → démarre la session :id
router.post('/:id/lancer',   authMiddleware, postLancerSession);
// POST /:id/terminer  → clôture la session :id
router.post('/:id/terminer', authMiddleware, postTerminerSession);
// POST /:id/delete  → supprime la session :id (ADMIN / SUPER_ADMIN)
router.post('/:id/delete',   authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), postDeleteSession);
export { router as planificationRouter };
