import express  from 'express';
import {loginUser, getCurrentUser } from '../../controllers/auth/authController.js';
import {authenticateToken}  from '../../middleware/auth.js';

const router = express.Router();

router.post('/login', loginUser);
router.get('/me', authenticateToken, getCurrentUser);

export default router;
