import pool from "../../config/database.js";

export const getProjectMonitoring = async (req, res) => {
    try {
        const query = `
            SELECT
                p.id AS project_id,
                p.projectname AS project_name,
                p.status AS project_status,

                /* Client */
                p.client_id,
                COALESCE(c.full_name, u_client.name) AS client_name,
                COALESCE(c.email_address, u_client.email) AS client_email,

                /* Developer */
                p.developer_id,
                COALESCE(d.full_name, u_developer.name) AS developer_name,
                COALESCE(d.email_address, u_developer.email) AS developer_email,

                /* Monitoring */
                COALESCE(p.progress_percentage, 0) AS progress_percentage,
                p.budget,
                p.timeline,

                p.created_at,
                p.updated_at

            FROM projects p

            LEFT JOIN clients c
                ON c.id = p.client_id

            LEFT JOIN users u_client
                ON u_client.id = c.user_id

            LEFT JOIN developers d
                ON d.id = p.developer_id

            LEFT JOIN users u_developer
                ON u_developer.id = d.id

            ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC;
        `;

        const result = await pool.query(query);

        return res.status(200).json({
            success: true,
            totalProjects: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error(
            "Admin Project Monitoring Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching project monitoring data."
        });
    }
};