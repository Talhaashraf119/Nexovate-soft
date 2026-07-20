import scopeService from '../../services/scopeService.js';
import { createProjectWizard, createProjectQuestionnaire } from "../../services/wizardService.js";

export const saveGeneratedScope = async (req, res) => {
    try {
        const userId = req.user.id;
        const { questionnaireId, scope } = req.body;

        const savedScope = await scopeService.saveScope(userId, questionnaireId, scope);

        return res.status(201).json({
            success: true,
            message: "Scope saved successfully.",
            scope: savedScope
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 2. INITIAL GENERATE SCOPE
export const generateScope = async (req, res) => {
    try {
        const userId = req.user.id;
        const { questionnaireId } = req.body;

        const generatedScope = await scopeService.processScopeGeneration(userId, questionnaireId);

        return res.status(200).json({
            success: true,
            message: "Scope generated successfully.",
            scope: generatedScope
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 3. REGENERATE SCOPE (Accepts custom output requirements again)
export const regenerateScope = async (req, res) => {
    try {
        const userId = req.user.id;
        const { questionnaireId, feedback } = req.body; // client provides what to change

        if (!feedback) {
            return res.status(400).json({ success: false, error: "Feedback requirements are required for regeneration." });
        }

        const regeneratedScope = await scopeService.processScopeRegeneration(userId, questionnaireId, feedback);

        return res.status(200).json({
            success: true,
            message: "Scope regenerated successfully with new criteria.",
            scope: regeneratedScope
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 4. DOWNLOAD PDF (And auto-save document state if not already saved)
export const downloadScopePdf = async (req, res) => {
    try {
        const userId = req.user.id;
        const scopeId = req.params.id;

        const scope = await scopeService.fetchScopeForUser(userId, scopeId);
        if (!scope) {
            return res.status(404).json({ error: "Scope not found." });
        }

        // Generate buffer array directly
        const pdfBuffer = await scopeService.generatePdfBuffer(scope.scope_text);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="Scope_${scopeId}.pdf"`);

        return res.send(pdfBuffer);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};

// 5. SEND TO DEVELOPER (Auto-triggers tracking payload validation)
export const sendToDeveloper = async (req, res) => {
    try {
        const userId = req.user.id;
        const { scopeId, developerDetails } = req.body;

        if (!scopeId) {
            return res.status(400).json({ success: false, error: "Scope ID is missing." });
        }

        // Deliver scope updates payload downstream safely
        const transmissionReport = await scopeService.transmitToDeveloper(userId, scopeId, developerDetails || {});

        return res.status(200).json({
            success: true,
            message: "Project details and generated PDF safely routed to developer system.",
            data: transmissionReport
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 6. QUESTIONNAIRE CORE ENGINE MANAGEMENT
export const saveQuestionnaire = async (req, res) => {
    try {
        const userId = req.user.id;
        const { mcqAnswers, projectOverview } = req.body;

        if (!mcqAnswers || !projectOverview) {
            return res.status(400).json({ error: 'mcqAnswers and projectOverview are required.' });
        }

        const data = await scopeService.createQuestionnaire(userId, mcqAnswers, projectOverview);
        return res.status(201).json({ message: 'Questionnaire saved successfully', data });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const getScope = async (req, res) => {
    try {
        const userId = req.user.id;
        const scopeId = req.params.id;

        const scope = await scopeService.fetchScopeForUser(userId, scopeId);
        if (!scope) {
            return res.status(404).json({ error: 'Scope not found or unauthorized access.' });
        }

        return res.status(200).json({ scope });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const saveWizardData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, basics, description, budget, timeline } = req.body;

    if (!title?.trim() || !description?.trim() || budget == null || !timeline || !basics) {
      return res.status(400).json({
        error: "Missing required wizard data. Provide basics, description, budget, and timeline.",
      });
    }

    const project = await createProjectWizard(userId, title, basics, description, budget, timeline);

    return res.status(201).json({
        success: true,
        message: "Wizard saved successfully",
        projectId: project.id
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const saveQuestionnaireData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId, mcqAnswers, projectOverview } = req.body;

    if (!projectId || !Array.isArray(mcqAnswers) || mcqAnswers.length === 0) {
      return res.status(400).json({
        error: "projectId, mcqAnswers, and projectOverview are required.",
      });
    }

    const questionnaire = await createProjectQuestionnaire(userId, projectId, mcqAnswers, projectOverview);

    return res.status(201).json({
      message: "Questionnaire data saved and linked to project successfully",
      questionnaireId: questionnaire.id,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
