import express from "express";

import {
    getAdminProjectDetails,
    approveAdminProject
} from "../../controllers/admin/projectController.js";

import {
    authenticateToken,
    requireAdmin
} from "../../middleware/auth.js";

const router = express.Router();

router.get(
    "/:id",
    authenticateToken,
    requireAdmin,
    getAdminProjectDetails
);
router.put(
    "/:id/approve",
    authenticateToken,
    requireAdmin,
    approveAdminProject
);

export default router;