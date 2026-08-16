import pool from "../../config/database.js";

/**
 * GET /api/admin/payments
 *
 * Admin Payment Management
 *
 * Returns:
 * - Project name
 * - Client
 * - Developer
 * - Amount
 * - Payment status
 * - Transaction reference
 * - Verification information
 * - Release information
 */
export const getAdminPayments = async (req, res) => {
    try {
        const query = `
            SELECT
                p.id AS payment_id,

                /* Project */
                p.project_id,
                pr.projectname AS project_name,
                pr.status AS project_status,

                /* Client */
                p.client_id,
                u_client.name AS client_name,
                u_client.email AS client_email,

                /* Developer */
                p.developer_id,
                u_dev.name AS developer_name,
                u_dev.email AS developer_email,

                /* Payment */
                p.amount,
                p.status,
                p.transaction_ref,

                /* Admin verification */
                p.verified_by_admin_id,
                u_admin.name AS verified_by_admin,
                p.verified_at,

                /* Release */
                p.released_at,

                /* Dates */
                p.created_at,
                p.updated_at

            FROM payments p

            INNER JOIN projects pr
                ON p.project_id = pr.id

            LEFT JOIN users u_client
                ON p.client_id = u_client.id

            LEFT JOIN users u_dev
                ON p.developer_id = u_dev.id

            LEFT JOIN users u_admin
                ON p.verified_by_admin_id = u_admin.id

            ORDER BY p.created_at DESC;
        `;

        const result = await pool.query(query);

        return res.status(200).json({
            success: true,
            totalPayments: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error(
            "Admin Get Payments Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching payments."
        });
    }
};