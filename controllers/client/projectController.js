
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
    // Included budget back into the request destructuring
    const { projectName, purpose, projectOverview, budget, scope_document, status } = req.body;
    const clientId = req.user?.id; 

    // Added budget check into mandatory validation
    if (!projectName || !purpose || !projectOverview || !budget) {
        return res.status(400).json({ 
            message: 'Project name, purpose, project overview, and budget are required.' 
        });
    }

    // Enforce lowercase to match your PostgreSQL Enum type safely
    const initialStatus = status ? status.toLowerCase() : 'draft';

    try {
        const queryText = `
            INSERT INTO projects (projectName, purpose, projectOverview, budget, scope_document, status, client_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING id, projectName, purpose, projectOverview, budget, scope_document, status, client_id, created_at;
        `;
        
        const newProject = await pool.query(queryText, [
            projectName, 
            purpose,
            projectOverview, 
            budget,
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
            SELECT id, projectname, projectoverview, budget, scope_document, status, client_id, created_at 
            FROM projects 
            WHERE status = $1
            ORDER BY created_at DESC;
        `;
        
        const projectsResult = await pool.query(queryText, [PROJECT_STATUS.DRAFT]);
        
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

    if (!clientId) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized. Client ID not found.'
        });
    }

    try {
        const queryText = `
            SELECT 
                p.id AS project_id,
                p.projectname,
                p.status,

                COALESCE(p.progress_percentage, 0) AS progress_percentage,

                CASE 
                    WHEN p.budget IS NULL THEN 'Rs. 0'
                    ELSE CONCAT('Rs. ', p.budget::text)
                END AS budget,

                COALESCE(p.timeline, 'Not specified') AS timeline,

                COALESCE(p.milestone_note, '') AS milestone_note,

                u.name AS assigned_developer_name,
                u.email AS assigned_developer_email

            FROM projects p

            LEFT JOIN users u 
                ON p.developer_id = u.id

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
        console.error(
            'Get Client Projects Dashboard Error:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve your projects dashboard view.'
        });
    }
};
export const getClientProjectMilestoneReport = async (req, res) => {
    const clientId = req.user?.id;
    const { projectId } = req.params;

    if (!clientId) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized. Client ID not found.'
        });
    }

    if (!projectId) {
        return res.status(400).json({
            success: false,
            message: 'Project ID is required.'
        });
    }

    // Validate project ID
    const projectIdNumber = Number(projectId);

    if (!Number.isInteger(projectIdNumber) || projectIdNumber <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid project ID.'
        });
    }

    try {
        const queryText = `
            SELECT
                p.id AS project_id,
                p.projectname,
                p.status,

                COALESCE(p.timeline, 'Not specified') AS timeline,

                CASE
                    WHEN p.budget IS NULL THEN 'Rs. 0'
                    ELSE CONCAT('Rs. ', p.budget::text)
                END AS payment,

                COALESCE(p.progress_percentage, 0) AS progress_percentage,

                COALESCE(
                    NULLIF(p.milestone_note, ''),
                    'No milestone report available.'
                ) AS milestone_note,

                p.created_at,
                p.updated_at,

                u.name AS assigned_developer_name,
                u.email AS assigned_developer_email

            FROM projects p

            LEFT JOIN users u
                ON p.developer_id = u.id

            WHERE p.id = $1
              AND p.client_id = $2

            LIMIT 1;
        `;

        const result = await pool.query(queryText, [
            projectIdNumber,
            clientId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found or you do not have access to this project.'
            });
        }

        const project = result.rows[0];

        return res.status(200).json({
            success: true,
            message: 'Milestone report retrieved successfully.',
            report: {
                project_id: project.project_id,
                project_name: project.projectname,
                status: project.status,

                timeline: project.timeline,

                payment: project.payment,

                progress_percentage: project.progress_percentage,

                milestone_note: project.milestone_note,

                assigned_developer: {
                    name: project.assigned_developer_name,
                    email: project.assigned_developer_email
                },

                created_at: project.created_at,
                updated_at: project.updated_at
            }
        });

    } catch (error) {
        console.error(
            'Get Client Project Milestone Report Error:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve milestone report.'
        });
    }
};
export const assignDeveloperToProject = async (req, res) => {
    try {
        const { projectId } = req.params;

        const { developer_id } = req.body;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Project ID is required."
            });
        }

        if (!developer_id) {
            return res.status(400).json({
                success: false,
                message: "Developer ID is required."
            });
        }

        const project =
            await scopeService.assignDeveloperToProject(
                Number(projectId),
                Number(developer_id)
            );

        return res.status(200).json({
            success: true,
            message: "Developer assigned to project successfully.",
            project
        });

    } catch (error) {
        console.error(
            "Assign Developer Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};