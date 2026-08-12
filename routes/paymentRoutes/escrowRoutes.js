import express from 'express';
import { 
    clientDepositEscrow, 
    adminVerifyPayment, 
    adminReleasePayment, 
    getUserTransactionHistory,
    getAdminTransactionHistory
} from '../../controllers/payment/escrowController.js';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';

const router = express.Router();

// Client route to initiate deposit (Requires login)
router.post('/deposit', authenticateToken, clientDepositEscrow);

router.get('/history', authenticateToken, getUserTransactionHistory);
router.get('/admin/history', authenticateToken, requireAdmin, getAdminTransactionHistory);
// Admin-only verification and release routes
router.patch('/:paymentId/verify', authenticateToken, requireAdmin, adminVerifyPayment);
router.patch('/:paymentId/release', authenticateToken, requireAdmin, adminReleasePayment);

export default router;