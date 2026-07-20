import scopeService from'../../services/scopeService.js';
import path from 'path';
import pool from '../../config/database.js'; // Imported pool for direct developer queries

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

export const generateScope = async (req, res) => {
    try {
        const userId = req.user.id;
        const { questionnaireId } = req.body;

        const generatedScope = await scopeService.processScopeGeneration(
            userId,
            questionnaireId
        );

        return res.status(200).json({
            success: true,
            message: "Scope generated successfully.",
            scope: generatedScope
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

export const getScope = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user?.role; // Read user role from token middleware
        const scopeId = req.params.id;

        let scope = null;

        // If user is a developer, allow viewing any scope document directly
        if (userRole === 'developer') {
            const queryText = `SELECT * FROM scopes WHERE id = $1;`;
            const result = await pool.query(queryText, [scopeId]);
            if (result.rows.length > 0) {
                scope = result.rows[0];
            }
        } else {
            // Clients are restricted to only retrieving their own documents
            scope = await scopeService.fetchScopeForUser(userId, scopeId);
        }

        if (!scope) {
            return res.status(404).json({ error: 'Scope not found or unauthorized access.' });
        }

        return res.status(200).json({ scope });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const downloadScopePdf = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user?.role; // Read user role from token middleware
        const scopeId = req.params.id;

        let scopeText = null;

        // --- Role-Based Permission Check ---
        if (userRole === 'developer') {
            // Developers have permission to view/download any scope document
            const scopeQuery = `SELECT scope_text FROM scopes WHERE id = $1;`;
            const scopeResult = await pool.query(scopeQuery, [scopeId]);

            if (scopeResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Scope data not found."
                });
            }
            scopeText = scopeResult.rows[0].scope_text;
        } else {
            // Clients can only access their own documents
            const scope = await scopeService.fetchScopeForUser(userId, scopeId);

            if (!scope) {
                return res.status(403).json({
                    success: false,
                    error: "Access denied. You do not own this scope document."
                });
            }
            scopeText = scope.scope_text;
        }

        // Parse scope text safely (if it is stored as JSON string or a raw object)
        const scopeTextParsed = typeof scopeText === 'string' ? JSON.parse(scopeText) : scopeText;

        // Generate PDF using your service
        const pdfBuffer = await scopeService.generatePdfBuffer(scopeTextParsed);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Scope_${scopeId}.pdf"`
        );

        return res.send(pdfBuffer);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};