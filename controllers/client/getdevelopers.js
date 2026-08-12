// GET /api/scope/projects/:projectId/applicants

import projectApplications from "../../services/developersApply.js";

// Endpoint for clients to view all developers who applied for their project
export const getApplicantsForProject = async (req, res) => {
    try {
        const clientId = req.user.id;
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({ success: false, error: "Project ID parameter is required." });
        }

        const data = await projectApplications.getProjectApplicants(clientId, projectId);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        return res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
};