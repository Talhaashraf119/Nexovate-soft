import express from 'express';
import { 
    setPlatformCommission, 
    setMinWithdrawalAmount, 
    getPlatformSettings 
} from '../../controllers/admin/settingsController.js';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';

const router = express.Router();

// Enforce Auth & Admin Authorization for all setting modifications
router.use(authenticateToken, requireAdmin);

// Fetch All Settings
router.get('/', getPlatformSettings);

// API 6: Set Commission Percentage
router.patch('/commission', setPlatformCommission);

// API 7: Set Minimum Withdrawal Amount
router.patch('/min-withdrawal', setMinWithdrawalAmount);

export default router;