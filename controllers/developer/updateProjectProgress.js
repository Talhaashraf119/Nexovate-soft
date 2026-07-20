import pool from '../../config/database.js';

export const updateProgress = async (req, res) => {
    const projectId = req.params.id;
    const developerId = req.user?.id; // Authenticated developer's ID
    const userRole = req.user?.role;  // Authenticated user's role

    const { progress_percentage, status, milestone_note } = req.body;

    // 1. Validation checks
    if (userRole !== 'developer') {
        return res.status(403).json({ success: false, message: 'Access denied. Only registered developers can update project progress.' });
    }

    if (isNaN(Number(projectId))) {
        return res.status(400).json({ success: false, message: 'Invalid project ID format.' });
    }

    if (progress_percentage !== undefined) {
        const percent = Number(progress_percentage);
        if (isNaN(percent) || percent < 0 || percent > 100) {
            return res.status(400).json({ success: false, message: 'Progress percentage must be a number between 0 and 100.' });
        }
    }

    try {
        // 2. Fetch the project to verify assignment
        const checkQuery = `SELECT developer_id FROM projects WHERE id = $1;`;
        const checkResult = await pool.query(checkQuery, [projectId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        // 3. Prevent unassigned developers from modifying the progress
        if (checkResult.rows[0].developer_id !== developerId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. You are not the assigned developer for this project.' 
            });
        }

        // 4. Build the dynamic update query
        const queryParts = [];
        const values = [];
        let placeholderIndex = 1;

        if (progress_percentage !== undefined) {
            queryParts.push(`progress_percentage = $${placeholderIndex++}`);
            values.push(Number(progress_percentage));
        }
        if (status !== undefined) {
            queryParts.push(`status = $${placeholderIndex++}`);
            values.push(status.trim());
        }
        if (milestone_note !== undefined) {
            queryParts.push(`milestone_note = $${placeholderIndex++}`);
            values.push(milestone_note.trim() || null);
        }

        // If no fields were provided to update, throw a bad request
        if (queryParts.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields provided for update (progress_percentage, status, or milestone_note required).' });
        }

        values.push(projectId);
        const queryText = `
            UPDATE projects 
            SET ${queryParts.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${placeholderIndex}
            RETURNING id, title, status, progress_percentage, milestone_note, updated_at;
        `;

        const result = await pool.query(queryText, values);

        return res.status(200).json({
            success: true,
            message: 'Project workspace progress updated successfully.',
            project: result.rows[0]
        });

    } catch (error) {
        console.error('Update Project Progress Error:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error while saving project progress.' });
    }
};