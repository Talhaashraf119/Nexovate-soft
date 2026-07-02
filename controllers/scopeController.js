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

        if (!questionnaireId) {
            return res.status(400).json({ error: 'questionnaireId is required.' });
        }

        const scope = await scopeService.processScopeGeneration(userId, questionnaireId);
        return res.status(201).json({ message: 'Scope generated successfully', scope });
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

export const downloadScopePdf = async (req, res) => {
    try {
        const userId = req.user.id;
        const scopeId = req.params.id;

        const scope = await scopeService.fetchScopeForUser(userId, scopeId);
        if (!scope || !scope.pdf_path) {
            return res.status(404).json({ error: 'PDF not found or unauthorized access.' });
        }

        const absolutePath = path.resolve(scope.pdf_path);
        return res.download(absolutePath, `Scope_Document_${scopeId}.pdf`);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
