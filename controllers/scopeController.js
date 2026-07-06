import scopeService from'../services/scopeService.js';
import path from 'path';

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

        const scope = await scopeService.processScopeGeneration(
            userId,
            questionnaireId
        );

        return res.status(201).json({
            message: "Scope generated successfully",
            scope,
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            error: err.message,
        });

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

export const downloadScopePdf = async (req, res) => {

    try {

        const userId = req.user.id;

        const scopeId = req.params.id;

        const scope = await scopeService.fetchScopeForUser(
            userId,
            scopeId
        );

        if (!scope) {

            return res.status(404).json({
                error: "Scope not found."
            });

        }

        const pdfBuffer = await scopeService.generatePdfBuffer(
            scope.scope_text
        );

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Scope_${scopeId}.pdf"`
        );

        return res.send(pdfBuffer);

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            error: err.message,
        });

    }

};
