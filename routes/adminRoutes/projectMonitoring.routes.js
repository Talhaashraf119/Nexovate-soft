import express from "express";

import {
    getProjectMonitoring
} from "../../controllers/admin/projectMonitoringController.js";

import {
    authenticateToken,
    requireAdmin
} from "../../middleware/auth.js";

const router = express.Router();

router.get(
    "/",
    authenticateToken,
    requireAdmin,
    getProjectMonitoring
);

export default router;