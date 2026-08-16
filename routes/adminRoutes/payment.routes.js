import express from "express";

import {
    getAdminPayments
} from "../../controllers/admin/paymentController.js";

import {
    authenticateToken,
    requireAdmin
} from "../../middleware/auth.js";

const router = express.Router();

router.get(
    "/",
    authenticateToken,
    requireAdmin,
    getAdminPayments
);

export default router;