import pool from '../config/database.js';

export const getProjectApplicants = async (clientId, projectId) => {
    // 1. Verify project exists and belongs to this client
    const projectCheck = await pool.query(
        `SELECT id, projectName, budget, status FROM projects WHERE id = $1 AND client_id = $2`,
        [projectId, clientId]
    );

    if (!projectCheck.rows.length) {
        throw new Error("Project not found or you are not authorized to view its applications.");
    }

    // 2. Fetch all applicant developer details + application info
    const applicantsQuery = `
        SELECT 
            pa.id AS application_id,
            pa.bid_amount,
            pa.cover_letter,
            pa.status AS application_status,
            pa.created_at AS applied_at,
            u.id AS developer_id,
            u.name AS developer_name,
            u.email AS developer_email
        FROM project_applications pa
        JOIN users u ON pa.developer_id = u.id
        WHERE pa.project_id = $1
        ORDER BY pa.created_at DESC;
    `;

    const { rows } = await pool.query(applicantsQuery, [projectId]);

    return {
        project: projectCheck.rows[0],
        applicantCount: rows.length,
        applicants: rows
    };
};
const projectApplications = {
    getProjectApplicants

};
export default projectApplications;