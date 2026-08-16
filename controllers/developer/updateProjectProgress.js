import pool from '../../config/database.js';

export const updateProgress = async (req, res) => {
    const projectId = Number(req.params.id);
    const developerId = req.user?.id;
    const userRole = req.user?.role;

    const {
        progress_percentage,
        status,
        milestone
    } = req.body;

    // -----------------------------------------
    // 1. AUTHORIZATION
    // -----------------------------------------

    if (userRole !== 'developer') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Only developers can update project progress.'
        });
    }

    if (!Number.isInteger(projectId) || projectId <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid project ID format.'
        });
    }

    // -----------------------------------------
    // 2. VALIDATE PROGRESS
    // -----------------------------------------

    let progress = undefined;

    if (progress_percentage !== undefined) {
        progress = Number(progress_percentage);

        if (
            !Number.isFinite(progress) ||
            progress < 0 ||
            progress > 100
        ) {
            return res.status(400).json({
                success: false,
                message: 'Progress percentage must be between 0 and 100.'
            });
        }
    }

    // -----------------------------------------
    // 3. VALIDATE MILESTONE
    // -----------------------------------------

    if (milestone !== undefined) {

        if (!milestone || typeof milestone !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Milestone must be an object.'
            });
        }

        if (!milestone.title || !milestone.title.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Milestone title is required.'
            });
        }

        if (!milestone.description || !milestone.description.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Milestone description is required.'
            });
        }
    }

    // -----------------------------------------
    // 4. FETCH PROJECT
    // -----------------------------------------

    try {

        const projectQuery = `
            SELECT
                id,
                projectname,
                developer_id,
                status,
                progress_percentage,
                milestones
            FROM projects
            WHERE id = $1
        `;

        const projectResult = await pool.query(
            projectQuery,
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        const project = projectResult.rows[0];

        // -----------------------------------------
        // 5. CHECK ASSIGNED DEVELOPER
        // -----------------------------------------

        if (Number(project.developer_id) !== Number(developerId)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You are not the assigned developer for this project.'
            });
        }

        // -----------------------------------------
        // 6. GET EXISTING MILESTONES
        // -----------------------------------------

        let milestones = project.milestones || [];

        if (typeof milestones === 'string') {
            milestones = JSON.parse(milestones);
        }

        if (!Array.isArray(milestones)) {
            milestones = [];
        }

        // -----------------------------------------
        // 7. ADD NEW MILESTONE
        // -----------------------------------------

        if (milestone !== undefined) {

            const newMilestone = {
                id: Date.now(),
                title: milestone.title.trim(),
                description: milestone.description.trim(),
                progress:
                    milestone.progress !== undefined
                        ? Number(milestone.progress)
                        : progress ?? project.progress_percentage ?? 0,

                status:
                    milestone.status?.trim() ||
                    'in_progress',

                created_at: new Date().toISOString()
            };

            milestones.push(newMilestone);
        }

        // -----------------------------------------
        // 8. BUILD UPDATE
        // -----------------------------------------

        const updates = [];
        const values = [];
        let index = 1;

        if (progress !== undefined) {
            updates.push(
                `progress_percentage = $${index}`
            );

            values.push(progress);
            index++;
        }

        if (status !== undefined) {

            const allowedStatuses = [
                'in_progress',
                'completed',
                'open_to_developers'
            ];

            if (!allowedStatuses.includes(status.trim())) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`
                });
            }

            updates.push(
                `status = $${index}`
            );

            values.push(status.trim());
            index++;
        }

        if (milestone !== undefined) {

            updates.push(
                `milestones = $${index}::jsonb`
            );

            values.push(JSON.stringify(milestones));
            index++;
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nothing to update.'
            });
        }

        // updated_at
        updates.push(
            'updated_at = CURRENT_TIMESTAMP'
        );

        values.push(projectId);

        // -----------------------------------------
        // 9. UPDATE PROJECT
        // -----------------------------------------

        const updateQuery = `
            UPDATE projects
            SET
                ${updates.join(', ')}
            WHERE id = $${index}
            RETURNING
                id,
                projectname,
                status,
                progress_percentage,
                milestones,
                updated_at
        `;

        const result = await pool.query(
            updateQuery,
            values
        );

        return res.status(200).json({
            success: true,
            message: milestone
                ? 'Project progress and milestone updated successfully.'
                : 'Project progress updated successfully.',

            project: result.rows[0]
        });

    } catch (error) {

        console.error(
            'Update Project Progress Error:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Internal server error while updating project progress.'
        });
    }
};