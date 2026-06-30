import express from 'express';
import { createDeveloper, getAllDeveloper, getDeveloperById, updateDeveloper } from '../controllers/developerController.js';

const router = express.Router();

router.post('/', createDeveloper);
router.get('/', getAllDeveloper);
router.get('/:id', getDeveloperById);
router.put('/:id', updateDeveloper);

export default router;
