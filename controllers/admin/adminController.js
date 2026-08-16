import pool from "../../config/database.js";

export const getAdminDashboard = async (req, res) => {
    try {
        /*
        |--------------------------------------------------------------------------
        | 1. ACTIVE PROJECTS
        |--------------------------------------------------------------------------
        */

        const activeProjectsQuery = `
            SELECT COUNT(*) AS total
            FROM projects
            WHERE status = 'in_progress';
        `;

        /*
        |--------------------------------------------------------------------------
        | 2. PENDING APPROVAL / PROJECTS AWAITING APPROVAL
        |--------------------------------------------------------------------------
        */

        const pendingApprovalQuery = `
            SELECT COUNT(*) AS total
            FROM projects
            WHERE status = 'draft';
        `;
        const awaitingApprovalProjectsQuery = `
    SELECT
        p.id,
        p.projectname,
        p.purpose,
        p.budget,
        p.timeline,
        p.status,
        p.created_at,
        c.full_name AS client_name
    FROM projects p
    LEFT JOIN clients c
        ON c.user_id = p.client_id
    WHERE p.status = 'draft'
    ORDER BY p.created_at DESC;
`;

        /*
        |--------------------------------------------------------------------------
        | 3. PAYMENT HELD
        |--------------------------------------------------------------------------
        */

        const paymentHeldQuery = `
            SELECT
                COUNT(*) AS total_payments,
                COALESCE(SUM(amount), 0) AS total_amount
            FROM payments
            WHERE status = 'held';
        `;

        /*
        |--------------------------------------------------------------------------
        | 4. TOTAL DEVELOPERS
        |--------------------------------------------------------------------------
        */

        const totalDevelopersQuery = `
            SELECT COUNT(*) AS total
            FROM developers;
        `;

        /*
        |--------------------------------------------------------------------------
        | 5. TOTAL CLIENTS
        |--------------------------------------------------------------------------
        */

        const totalClientsQuery = `
            SELECT COUNT(*) AS total
            FROM clients;
        `;

        /*
        |--------------------------------------------------------------------------
        | 6. TOTAL PROJECTS
        |--------------------------------------------------------------------------
        */

        const totalProjectsQuery = `
            SELECT COUNT(*) AS total
            FROM projects;
        `;

        /*
        |--------------------------------------------------------------------------
        | Run all queries
        |--------------------------------------------------------------------------
        */

  const [
    activeProjectsResult,
    pendingApprovalResult,
    paymentHeldResult,
    totalDevelopersResult,
    totalClientsResult,
    totalProjectsResult,
    awaitingApprovalProjectsResult
] = await Promise.all([
    pool.query(activeProjectsQuery),
    pool.query(pendingApprovalQuery),
    pool.query(paymentHeldQuery),
    pool.query(totalDevelopersQuery),
    pool.query(totalClientsQuery),
    pool.query(totalProjectsQuery),
    pool.query(awaitingApprovalProjectsQuery)
]);

        /*
        |--------------------------------------------------------------------------
        | Prepare dashboard response
        |--------------------------------------------------------------------------
        */

        const dashboard = {
            activeProjects: Number(
                activeProjectsResult.rows[0].total
            ),

            pendingApproval: Number(
                pendingApprovalResult.rows[0].total
            ),

            paymentHeld: {
                count: Number(
                    paymentHeldResult.rows[0].total_payments
                ),
                amount: Number(
                    paymentHeldResult.rows[0].total_amount
                )
            },

            totalDevelopers: Number(
                totalDevelopersResult.rows[0].total
            ),

            totalClients: Number(
                totalClientsResult.rows[0].total
            ),

            totalProjects: Number(
                totalProjectsResult.rows[0].total
            ),

            projectsAwaitingApproval: Number(
                pendingApprovalResult.rows[0].total
            ),
                projectsAwaitingApproval:
        awaitingApprovalProjectsResult.rows
        };

        return res.status(200).json({
            success: true,
            message: "Admin dashboard data retrieved successfully.",
            dashboard
        });

    } catch (error) {

        console.error(
            "Get Admin Dashboard Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error while loading admin dashboard."
        });
    }
};