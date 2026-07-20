import express from 'express';
import { 
    createProject, 
    getAvailableProjects, 
    getProjectById, 
    applyToProject, 
    getClientProjects,
    downloadProjectPDF
} from '../../controllers/client/projectController.js';
import { authenticateToken } from '../../middleware/auth.js'; 

const router = express.Router();

router.post('/', authenticateToken, createProject);
router.get('/', authenticateToken, getAvailableProjects);
router.get("/projectsDetail", authenticateToken, getClientProjects);

router.get('/:id', authenticateToken, getProjectById);
router.patch('/:id/apply', authenticateToken, applyToProject);
router.get('/:id/download', authenticateToken, downloadProjectPDF);

export default router;
