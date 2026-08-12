import express  from 'express';
import {loginUser, getCurrentUser, registerUser } from '../../controllers/auth/authController.js';
import {authenticateToken}  from '../../middleware/auth.js';

const router = express.Router();

router.post('/login', loginUser);
router.post('/register', registerUser);
router.get('/me', authenticateToken, getCurrentUser);

export default router;
