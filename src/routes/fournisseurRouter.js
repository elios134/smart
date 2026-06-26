// ── fournisseurRouter.js ──────────────────────────────────────
// Routeur du module "Fournisseurs".
// La consultation est ouverte à tout utilisateur connecté ; la création
// et la modification sont réservées aux ADMIN/SUPER_ADMIN ; seule la
// suppression (action la plus risquée) est réservée au SUPER_ADMIN.
// ──────────────────────────────────────────────────────────────
import { Router } from 'express';
import { authMiddleware, requireRole } from '../services/authMiddleware.js';
import { getFournisseurs, postAddFournisseur, postEditFournisseur, postDeleteFournisseur } from '../controllers/fournisseurController.js';
const router = Router();
// GET /  → liste des fournisseurs (tout utilisateur connecté)
router.get('/',            authMiddleware, getFournisseurs);
// POST /add  → ajoute un fournisseur (ADMIN / SUPER_ADMIN)
router.post('/add',        authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), postAddFournisseur);
// POST /:id/edit  → modifie le fournisseur identifié par :id (ADMIN / SUPER_ADMIN)
router.post('/:id/edit',   authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), postEditFournisseur);
// POST /:id/delete  → supprime le fournisseur :id (SUPER_ADMIN uniquement)
router.post('/:id/delete', authMiddleware, requireRole('SUPER_ADMIN'),          postDeleteFournisseur);
export { router as fournisseurRouter };
