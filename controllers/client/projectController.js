
import scopeService from '../../services/scopeService.js';
import pool from '../../config/database.js';

const PROJECT_STATUS = {
    DRAFT: 'draft',
    APPROVED: 'approved',
    OPEN: 'open_to_developers',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed'
};

export const downloadProjectPDF = async (req, res) => {
    const projectId = req.params.id;

    if (isNaN(Number(projectId))) {
        return res.status(400).json({ success: false, message: "Invalid project ID format." });
    }

    try {
        // Fetch the project details
        const projectQuery = `SELECT title, scope_document, status FROM projects WHERE id = $1;`;
        const projectResult = await pool.query(projectQuery, [projectId]);

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        const project = projectResult.rows[0];

        // Security check: If project is in "draft" mode, developers shouldn't see it yet
        if (project.status === 'draft') {
            return res.status(403).json({ 
                success: false, 
                message: "Unauthorized. This project scope is currently in draft and not yet available to developers." 
            });
        }

        const scopeId = project.scope_document;
        if (!scopeId) {
            return res.status(404).json({ 
                success: false, 
                message: 'No scope document has been linked to this project yet.' 
            });
        }

        // Fetch scope text directly from scopes table (bypassing ownership filter because it is an open project)
        const scopeQuery = `SELECT scope_text FROM scopes WHERE id = $1;`;
        const scopeResult = await pool.query(scopeQuery, [scopeId]);

        if (scopeResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Scope data not found.' });
        }

        // Parse and generate
        const scopeTextParsed = JSON.parse(scopeResult.rows[0].scope_text);
        const pdfBuffer = await scopeService.generatePdfBuffer(scopeTextParsed);

        const safeFileName = project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Project_Scope_${safeFileName}.pdf"`
        );

        return res.send(pdfBuffer);

    } catch (error) {
        console.error('Download Project PDF Error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to generate project scope PDF.' });
    }
};
export const applyToProject = async (req, res) => {
    const projectId = req.params.id;
    const developerId = req.user?.id; 
    const { cover_letter, bid_amount } = req.body;

    if (!developerId) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Only logged-in developers can apply.' });
    }

    if (!cover_letter || !bid_amount) {
        return res.status(400).json({ 
            success: false, 
            message: 'Cover letter and bid amount are required fields to apply.' 
        });
    }

    if (isNaN(Number(bid_amount)) || Number(bid_amount) <= 0) {
        return res.status(400).json({ 
            success: false, 
            message: 'Bid amount must be a valid number greater than zero.' 
        });
    }

    try {
        const checkQuery = `SELECT status, client_id FROM projects WHERE id = $1;`;
        const checkResult = await pool.query(checkQuery, [projectId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        const project = checkResult.rows[0];

        if (project.client_id === developerId) {
            return res.status(400).json({ success: false, message: 'Clients cannot apply to their own projects.' });
        }

        if (project.status !== PROJECT_STATUS.OPEN) {
            return res.status(400).json({ success: false, message: 'This project is no longer accepting new applications.' });
        }

        const insertQuery = `
            INSERT INTO project_applications (project_id, developer_id, cover_letter, bid_amount)
            VALUES ($1, $2, $3, $4)
            RETURNING id, project_id, developer_id, cover_letter, bid_amount, status, created_at;
        `;
        
        const appResult = await pool.query(insertQuery, [
            projectId, 
            developerId, 
            cover_letter.trim(), 
            Number(bid_amount)
        ]);

        return res.status(201).json({
            success: true,
            message: 'Application submitted successfully! The project remains open for other applicants.',
            application: appResult.rows[0]
        });

    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ 
                success: false, 
                message: 'You have already submitted an application for this project.' 
            });
        }

        console.error('Apply Project Error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to process project application.' });
    }
};

export const createProject = async (req, res) => {
    // budget has been removed; utilizing the clean new naming scheme
    const { projectName, purpose, projectOverview, scope_document, status } = req.body;
    const clientId = req.user?.id; 

    // Validate using your new atomic parameters
    if (!projectName || !purpose || !projectOverview) {
        return res.status(400).json({ 
            message: 'Project name, purpose, and project overview description are required.' 
        });
    }

    const initialStatus = status || 'draft';

    try {
        const queryText = `
            INSERT INTO projects (projectName, purpose, projectOverview, scope_document, status, client_id) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING id, projectName, purpose, projectOverview, scope_document, status, client_id, created_at;
        `;
        
        const newProject = await pool.query(queryText, [
            projectName, 
            purpose,
            projectOverview, 
            scope_document || null, 
            initialStatus, 
            clientId
        ]);

        return res.status(201).json({
            message: 'Project created successfully.',
            project: newProject.rows[0]
        });
    } catch (error) {
        console.error('Create Project Error:', error.message);
        return res.status(500).json({ message: 'Failed to create project due to a server error.' });
    }
};

export const getAvailableProjects = async (req, res) => {
    try {
        const queryText = `
            SELECT id, title, description, budget, scope_document, status, client_id, created_at 
            FROM projects 
            WHERE status = $1
            ORDER BY created_at DESC;
        `;
        
        const projectsResult = await pool.query(queryText, [PROJECT_STATUS.OPEN]);
        
        return res.status(200).json(projectsResult.rows);
    } catch (error) {
        console.error('Get Available Projects Error:', error.message);
        return res.status(500).json({ message: 'Failed to retrieve available projects.' });
    }
};

export const getProjectById = async (req, res) => {
    const projectId = req.params.id;

    if (!projectId) {
        return res.status(400).json({ message: 'Project ID parameter is missing.' });
    }

    try {
        const queryText = `SELECT * FROM projects WHERE id = $1;`;
        const projectResult = await pool.query(queryText, [projectId]);
        
        if (projectResult.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        
        return res.status(200).json(projectResult.rows[0]);
    } catch (error) {
        console.error('Get Project By ID Error:', error.message);
        return res.status(500).json({ message: 'Failed to retrieve project details.' });
    }
};

export const getClientProjects = async (req, res) => {
    const clientId = req.user?.id;

    try {
        const queryText = `
            SELECT 
                p.id AS project_id,
                p.title,
                p.status,
                p.timeline,
                COALESCE(p.progress_percentage, 0) AS progress_percentage,
                p.milestone_note, -- Added this field to pull notes for the client dashboard
                CASE 
                    WHEN p.budget IS NULL THEN 'Rs. 0'
                    WHEN p.budget LIKE 'Rs.%' THEN p.budget
                    ELSE CONCAT('Rs. ', p.budget)
                END AS budget_in_rs,
                u.name AS assigned_developer_name,
                u.email AS assigned_developer_email
            FROM projects p
            LEFT JOIN users u ON p.developer_id = u.id
            WHERE p.client_id = $1
            ORDER BY p.created_at DESC;
        `;

        const result = await pool.query(queryText, [clientId]);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            projects: result.rows
        });
    } catch (error) {
        console.error('Get Client Projects Dashboard Error:', error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to retrieve your projects dashboard view.' 
        });
    }
};

