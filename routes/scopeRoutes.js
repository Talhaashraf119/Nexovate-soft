import express from "express";
import {
  saveQuestionnaire,
  generateScope,
  getScope,
  downloadScopePdf,
} from "../controllers/scopeController.js";
import { authenticateToken } from "../middleware/auth.js";
import { saveGeneratedScope } from "../controllers/saveGeneratedScope.js";

const router = express.Router();

router.post("/questionnaire", authenticateToken, saveQuestionnaire);
router.post("/generate-scope", authenticateToken, generateScope);
router.get("/scope/:id", authenticateToken, getScope);
router.get("/scope/:id/download", authenticateToken, downloadScopePdf);
router.post("/save-scope", authenticateToken, saveGeneratedScope);

export default router;
