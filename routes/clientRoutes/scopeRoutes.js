import express from "express";
import { authenticateToken } from "../../middleware/auth.js";
import {
  downloadScopePdf,
  generateScope,
  getScope,
} from "../../controllers/client/scopeController.js";
import { saveGeneratedScope } from "../../controllers/client/saveGeneratedScope.js";
import { regenerateScope, saveQuestionnaireData, sendToDeveloper } from "../../controllers/client/wizardController.js";

const router = express.Router();

router.post("/questionnaire", authenticateToken, saveQuestionnaireData);
router.post("/generate-scope", authenticateToken, generateScope);
router.get("/scope/:id", authenticateToken, getScope);
router.get("/scope/:id/download", authenticateToken, downloadScopePdf);
router.post("/save-scope", authenticateToken, saveGeneratedScope);
router.post("/scope/send-to-developer", authenticateToken, sendToDeveloper);
router.post("/scope/regenerate", authenticateToken, regenerateScope);

export default router;
