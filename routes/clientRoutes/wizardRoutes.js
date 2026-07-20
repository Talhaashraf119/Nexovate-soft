import express from 'express';

import { authenticateToken } from '../../middleware/auth.js'; 
import { saveQuestionnaireData, saveWizardData } from '../../controllers/client/wizardController.js';

const router = express.Router();

router.post('/wizard', authenticateToken, saveWizardData);
router.post('/wizard/questionnaire', authenticateToken, saveQuestionnaireData);

export default router;
