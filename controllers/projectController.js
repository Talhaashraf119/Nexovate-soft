import pool from '../config/database.js';

const PROJECT_STATUS = {
    DRAFT: 'draft',
    APPROVED: 'approved',
    OPEN: 'open_to_developers',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed'
};
export const createProject = async (req, res) => {
    const { title, description, budget, scope_document, status } = req.body;
    const clientId = req.user?.id; 

    if (!title || !description || !budget) {
        return res.status(400).json({ message: 'Title, description, and budget are required.' });
    }

    const initialStatus = status || PROJECT_STATUS.DRAFT;

    try {
        const queryText = `
            INSERT INTO projects (title, description, budget, scope_document, status, client_id) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING id, title, description, budget, scope_document, status, client_id, created_at;
        `;
        
        const newProject = await pool.query(queryText, [
            title, 
            description, 
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
export const applyToProject = async (req, res) => {
    const projectId = req.params.id;
    const developerId = req.user?.id; 

    if (!developerId) {
        return res.status(401).json({ message: 'Unauthorized. Developer profile missing.' });
    }

    try {

        const checkQuery = `SELECT status, client_id FROM projects WHERE id = $1;`;
        const checkResult = await pool.query(checkQuery, [projectId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        const project = checkResult.rows[0];

        if (project.client_id === developerId) {
            return res.status(400).json({ message: 'Clients cannot apply to their own projects.' });
        }

        if (project.status !== PROJECT_STATUS.OPEN) {
            return res.status(400).json({ message: 'This project is no longer open to applications.' });
        }

        const updateQuery = `
            UPDATE projects 
            SET developer_id = $1, status = $2 
            WHERE id = $3 
            RETURNING *;
        `;
        
        const updatedProject = await pool.query(updateQuery, [
            developerId, 
            PROJECT_STATUS.IN_PROGRESS, 
            projectId
        ]);

        return res.status(200).json({
            message: 'Successfully assigned to the project.',
            project: updatedProject.rows[0]
        });

    } catch (error) {
        console.error('Apply Project Error:', error.message);
        return res.status(500).json({ message: 'Failed to apply to project.' });
    }
};
