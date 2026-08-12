import express from 'express';
import { 
  getAllProjectChatSummaries, 
  getAdminProjectChatHistory 
} from '../../controllers/admin/messageReview.js';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken, requireAdmin);

// 1. Matches GET /admin/chats and GET /admin/chats/
router.get('/', getAllProjectChatSummaries);

// 2. ONLY matches numbers! If the path is "chats", Express will skip this route.
router.get('/:projectId', getAdminProjectChatHistory);

export default router;