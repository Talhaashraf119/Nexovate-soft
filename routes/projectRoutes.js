import express from 'express';
import { 
    createProject, 
    getAvailableProjects, 
    getProjectById, 
    applyToProject 
} from '../controllers/projectController.js';
import { authenticateToken } from '../middleware/auth.js'; 

const router = express.Router();

router.post('/', authenticateToken, createProject);
router.get('/', authenticateToken, getAvailableProjects);
router.get('/:id', authenticateToken, getProjectById);
router.patch('/:id/apply', authenticateToken, applyToProject);

export default router;
