import scopeService from '../../services/scopeService.js';
import pool from '../../config/database.js';

// 1. ATOMIC START PROJECT 
export const startProjectAndGenerateIds = async (req, res) => {
    try {
        const userId = req.user.id;
        // Added budget to destructured request body
        const { projectName, purpose, projectOverview, budget } = req.body;

        // Added budget to required validation checks
        if (!projectName || !purpose || !projectOverview || !budget) {
            return res.status(400).json({ error: 'projectName, purpose, projectOverview, and budget are required.' });
        }

        // Passed budget into the service call
        const internalData = await scopeService.createProjectAndQuestionnaire(userId, projectName, purpose, projectOverview, budget);
        
        return res.status(201).json({
            success: true,
            message: 'Project and questionnaire created atomically.',
            ...internalData
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// 2. GENERATE INITIAL SCOPE
export const generateScope = async (req, res) => {
    try {
        const userId = req.user.id;
        const { questionnaireId } = req.body;

        const generatedScope = await scopeService.processScopeGeneration(userId, questionnaireId);
        return res.status(200).json({ success: true, scope: generatedScope });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 3. REGENERATE SCOPE
export const regenerateScope = async (req, res) => {
    try {
        const userId = req.user.id;
        const { questionnaireId, feedback } = req.body;

        if (!feedback) {
            return res.status(400).json({ success: false, error: "Feedback is required for regeneration." });
        }

        const regeneratedScope = await scopeService.processScopeRegeneration(userId, questionnaireId, feedback);
        return res.status(200).json({ success: true, scope: regeneratedScope });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 4. SAVE FINAL SCOPE DOCUMENT
export const saveGeneratedScope = async (req, res) => {
    try {
        const userId = req.user.id;
        const { questionnaireId, scope } = req.body;

        const savedScope = await scopeService.saveScope(userId, questionnaireId, scope);
        return res.status(201).json({ success: true, message: "Scope saved successfully.", scope: savedScope });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 5. FETCH SCOPE DATA
export const getScope = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user?.role;
        const scopeId = req.params.id;
        let scope = null;

        if (userRole === 'developer') {
            const result = await pool.query(`SELECT * FROM scopes WHERE id = $1;`, [scopeId]);
            if (result.rows.length > 0) scope = result.rows[0];
        } else {
            scope = await scopeService.fetchScopeForUser(userId, scopeId);
        }

        if (!scope) return res.status(404).json({ error: 'Scope not found.' });
        return res.status(200).json({ scope });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// 6. DOWNLOAD SCOPE PDF
export const downloadScopePdf = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user?.role;
        const scopeId = req.params.id;
        let scopeText = null;

        if (userRole === 'developer') {
            const scopeResult = await pool.query(`SELECT scope_text FROM scopes WHERE id = $1;`, [scopeId]);
            if (scopeResult.rows.length === 0) return res.status(404).json({ error: "Scope data not found." });
            scopeText = scopeResult.rows[0].scope_text;
        } else {
            const scope = await scopeService.fetchScopeForUser(userId, scopeId);
            if (!scope) return res.status(403).json({ error: "Access denied." });
            scopeText = scope.scope_text;
        }

        const scopeTextParsed = typeof scopeText === 'string' ? JSON.parse(scopeText) : scopeText;
        const pdfBuffer = await scopeService.generatePdfBuffer(scopeTextParsed);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="Scope_${scopeId}.pdf"`);
        return res.send(pdfBuffer);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

// 7. ROUTE TO DEVELOPER SYSTEM
export const sendToDeveloper = async (req, res) => {
    try {
        const userId = req.user.id;
        const { scopeId, developerDetails } = req.body;

        if (!scopeId) return res.status(400).json({ error: "Scope ID is missing." });

        const report = await scopeService.transmitToDeveloper(userId, scopeId, developerDetails || {});
        return res.status(200).json({ success: true, message: "Routed to developer system.", data: report });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};