import express from "express";
import messageReviewRouter from "./messageReviewRouter.js";
import delRoutes from "./delRoutes.js";
import settingsRoutes from "./settingsRoutes.js";
import { getAdminDashboard } from "../../controllers/admin/adminController.js";
import {
  getDeveloperApprovalStats,
  getDeveloperApprovals,
  updateDeveloperApproval,
  updateDeveloperAccountStatus,
} from "../../controllers/admin/developerApprovalController.js";
import { authenticateToken, requireAdmin } from "../../middleware/auth.js";
import clientRoutes from "./client.routes.js";
import projectRoutes from "./project.routes.js";
import projectMonitoringRoutes from "./projectMonitoring.routes.js";

import paymentRoutes from "./payment.routes.js";
const router = express.Router();

// Any request to /admin/chats will go to messageReviewRouter
router.use("/chats", messageReviewRouter);
router.use("/", delRoutes);
router.use("/settings", settingsRoutes);
router.use("/projects", projectRoutes);
router.use(
    "/project-monitoring",
    projectMonitoringRoutes
);

router.use("/payments", paymentRoutes);

router.use("/clients", clientRoutes);
router.get("/dashboard", authenticateToken, requireAdmin, getAdminDashboard);
router.get(
  "/stats",
  authenticateToken,
  requireAdmin,
  getDeveloperApprovalStats,
);

/**
 * Developer list
 *
 * GET /api/admin/developers/approval
 *
 * Optional:
 * ?status=pending
 * ?status=approved
 * ?status=rejected
 */
router.get("/approval", authenticateToken, requireAdmin, getDeveloperApprovals);

/**
 * Approve / Reject developer
 *
 * PUT /api/admin/developers/approval/:id
 */
router.put("/approval/:id", authenticateToken, requireAdmin, updateDeveloperApproval);

/**
 * Active / Suspended / Blocked
 *
 * PUT /api/admin/developers/approval/:id/account-status
 */
router.put(
  "/:id/account-status",
  authenticateToken,
  requireAdmin,
  updateDeveloperAccountStatus,
);

// (Future admin feature routers can be mounted here too, e.g. router.use('/users', adminUserRouter))

export default router;
