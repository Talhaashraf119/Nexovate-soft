import express from "express";

import {
    getAllClients,
    getClientById,
    updateClientAccountStatus,
    deleteClient
} from "../../controllers/admin/clientController.js";

import {
    authenticateToken,
    requireAdmin
} from "../../middleware/auth.js";

const router = express.Router();


// Get all clients
router.get(
    "/",
    authenticateToken,
    requireAdmin,
    getAllClients
);


// Get single client
router.get(
    "/:id",
    authenticateToken,
    requireAdmin,
    getClientById
);


// Suspend / block / activate client
router.put(
    "/:id/status",
    authenticateToken,
    requireAdmin,
    updateClientAccountStatus
);


// Permanently delete client
router.delete(
    "/:id",
    authenticateToken,
    requireAdmin,
    deleteClient
);

export default router;