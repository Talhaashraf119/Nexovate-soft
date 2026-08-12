import express from 'express';
import messageReviewRouter from './messageReviewRouter.js';
import delRoutes from './delRoutes.js';
import settingsRoutes from './settingsRoutes.js';

const router = express.Router();

// Any request to /admin/chats will go to messageReviewRouter
router.use('/chats', messageReviewRouter);
router.use('/', delRoutes);
router.use('/settings', settingsRoutes);

// (Future admin feature routers can be mounted here too, e.g. router.use('/users', adminUserRouter))

export default router;