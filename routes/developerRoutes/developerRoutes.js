import express from 'express';
import { createDeveloper,getAllDeveloper,getDeveloperById ,updateDeveloper } from '../../controllers/developer/developerController.js';
import { authenticateToken } from '../../middleware/auth.js';
import { updateProgress } from '../../controllers/developer/updateProjectProgress.js';

const router = express.Router();

router.post('/', createDeveloper);
router.get('/', getAllDeveloper);
router.get('/:id', getDeveloperById);
router.put('/:id', updateDeveloper);
router.put('/:id/progress',authenticateToken, updateProgress);

export default router;
