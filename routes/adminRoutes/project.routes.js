import express from "express";

import {
    getAdminProjectDetails
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

export default router;