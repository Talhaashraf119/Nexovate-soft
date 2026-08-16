import express from 'express';
import {
    createDeveloper,
    getAllDeveloper,
    getDeveloperById,
    getDeveloperDashboard,
    getDeveloperProjects,
    updateDeveloper
} from '../../controllers/developer/developerController.js';
import { authenticateToken } from '../../middleware/auth.js';
import { updateProgress } from '../../controllers/developer/updateProjectProgress.js';

const router = express.Router();

router.post('/', createDeveloper);
router.get('/', getAllDeveloper);
router.get(
    '/dashboard',
    authenticateToken,
    getDeveloperDashboard);
    router.get(
    '/projects',
    authenticateToken,
    getDeveloperProjects
);
router.get('/:id', getDeveloperById);
router.put('/:id', updateDeveloper);
router.put('/:id/progress',authenticateToken, updateProgress);

export default router;
