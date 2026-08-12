import express from 'express';
import { deleteDeveloper, deleteClient, verifyDeveloper, toggleDeveloperAccountStatus } from '../../controllers/admin/adminManagement.js';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';

const router = express.Router();

// Protect all routes under this router
router.use(authenticateToken, requireAdmin);

router.delete('/developers/:id', deleteDeveloper);
router.delete('/clients/:id', deleteClient);
router.patch('/developers/:id/verify', verifyDeveloper);
router.patch('/developers/:id/status', toggleDeveloperAccountStatus);

export default router;