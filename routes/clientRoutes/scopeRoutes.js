import express from "express";
import { authenticateToken } from "../../middleware/auth.js";
import {
    startProjectAndGenerateIds,
    generateScope,
    regenerateScope,
    saveGeneratedScope,
    getScope,
    downloadScopePdf,
    sendToDeveloper
} from "../../controllers/client/scopeController.js";

const router = express.Router();

// Atomic Initial Flow
router.post("/start-project", authenticateToken, startProjectAndGenerateIds);
router.post("/generate-scope", authenticateToken, generateScope);
router.post("/scope/regenerate", authenticateToken, regenerateScope);
router.post("/save-scope", authenticateToken, saveGeneratedScope);

// Management and Utilities
router.get("/scope/:id", authenticateToken, getScope);
router.get("/scope/:id/download", authenticateToken, downloadScopePdf);
router.post("/scope/send-to-developer", authenticateToken, sendToDeveloper);

export default router;