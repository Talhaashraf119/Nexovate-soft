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
import { getApplicantsForProject } from '../../controllers/client/getdevelopers.js';

const router = express.Router();

router.post('/', authenticateToken, createProject);
router.get('/', authenticateToken, getAvailableProjects);
router.get("/projectsDetail", authenticateToken, getClientProjects);

router.get('/:id', authenticateToken, getProjectById);
router.patch('/:id/apply', authenticateToken, applyToProject);
router.get('/:id/download', authenticateToken, downloadProjectPDF);
router.get('/:projectId/applicants', authenticateToken, getApplicantsForProject);

export default router;
