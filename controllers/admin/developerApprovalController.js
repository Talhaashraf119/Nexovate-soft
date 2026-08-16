import pool from "../../config/database.js";

/**
 * GET ADMIN DEVELOPER APPROVAL STATS
 *
 * Returns:
 * - total approved
 * - total pending
 * - total rejected
 */
export const getDeveloperApprovalStats = async (req, res) => {
    try {
        const query = `
            SELECT
                COUNT(*) FILTER (
                    WHERE approval_status = 'approved'
                )::int AS total_approved,

                COUNT(*) FILTER (
                    WHERE approval_status = 'pending'
                )::int AS total_pending,

                COUNT(*) FILTER (
                    WHERE approval_status = 'rejected'
                )::int AS total_rejected
            FROM developers;
        `;

        const result = await pool.query(query);

        return res.status(200).json({
            success: true,
            stats: result.rows[0]
        });

    } catch (error) {
        console.error(
            "Get Developer Approval Stats Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to fetch developer approval statistics."
        });
    }
};


/**
 * GET DEVELOPERS FOR ADMIN
 *
 * Optional:
 * ?status=pending
 * ?status=approved
 * ?status=rejected
 */
export const getDeveloperApprovals = async (req, res) => {
    const { status } = req.query;

    const allowedStatuses = [
        "pending",
        "approved",
        "rejected"
    ];

    try {
        let query = `
            SELECT
                id,
                full_name,
                email_address,
                your_domain,
                tech_stack,
                linkdin_url,
                github_url,
                is_verified,
                is_enabled,
                approval_status,
                account_status,
                bank_name,
                bank_account_title,
                bank_account_number_iban,
                created_at,
                updated_at
            FROM developers
        `;

        const values = [];

        if (status !== undefined) {

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid status. Allowed values: pending, approved, rejected."
                });
            }

            query += ` WHERE approval_status = $1`;
            values.push(status);
        }

        query += ` ORDER BY created_at DESC`;

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            developers: result.rows
        });

    } catch (error) {
        console.error(
            "Get Developer Approvals Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to fetch developers."
        });
    }
};


/**
 * APPROVE / REJECT DEVELOPER
 *
 * PUT /:id/approval
 *
 * Body:
 * {
 *   "approval_status": "approved"
 * }
 *
 * OR
 *
 * {
 *   "approval_status": "rejected"
 * }
 */
export const updateDeveloperApproval = async (req, res) => {
    const { id } = req.params;
    const { approval_status } = req.body;

    if (!/^\d+$/.test(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid developer ID."
        });
    }

    const developerId = Number(id);

    const allowedStatuses = [
        "approved",
        "rejected"
    ];

    if (!allowedStatuses.includes(approval_status)) {
        return res.status(400).json({
            success: false,
            message:
                "approval_status must be either 'approved' or 'rejected'."
        });
    }

    try {

  const query = `
    UPDATE developers
    SET
        approval_status = $1::varchar,
        is_verified = CASE
            WHEN $1::varchar = 'approved' THEN true
            ELSE false
        END,
        is_enabled = CASE
            WHEN $1::varchar = 'approved' THEN true
            ELSE false
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING
        id,
        full_name,
        email_address,
        approval_status,
        account_status,
        is_verified,
        is_enabled,
        updated_at;
`;

        const result = await pool.query(
            query,
            [approval_status, developerId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Developer not found."
            });
        }

        return res.status(200).json({
            success: true,
            message:
                `Developer ${approval_status} successfully.`,
            developer: result.rows[0]
        });

    } catch (error) {
        console.error(
            "Update Developer Approval Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to update developer approval."
        });
    }
};


/**
 * SUSPEND / ACTIVATE / BLOCK DEVELOPER
 *
 * PUT /:id/account-status
 *
 * Body:
 * {
 *   "account_status": "suspended"
 * }
 *
 * OR:
 *
 * {
 *   "account_status": "active"
 * }
 *
 * OR:
 *
 * {
 *   "account_status": "blocked"
 * }
 */
export const updateDeveloperAccountStatus = async (req, res) => {
    const { id } = req.params;
    const { account_status } = req.body;

    // Validate developer ID
    if (isNaN(Number(id))) {
        return res.status(400).json({
            success: false,
            message: "Invalid Developer ID format."
        });
    }

    // Validate account status
    const allowedStatuses = ["active", "suspended", "blocked"];

    if (!account_status || !allowedStatuses.includes(account_status)) {
        return res.status(400).json({
            success: false,
            message: `account_status must be one of: ${allowedStatuses.join(", ")}`
        });
    }

    const developerId = Number(id);

    try {
        const query = `
            UPDATE developers
            SET
                account_status = $1::varchar,
                is_enabled = CASE
                    WHEN $1::varchar = 'active' THEN true
                    ELSE false
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2::integer
            RETURNING
                id,
                full_name,
                email_address,
                is_verified,
                is_enabled,
                approval_status,
                account_status,
                updated_at;
        `;

        const result = await pool.query(query, [
            account_status,
            developerId
        ]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: `Developer with ID ${developerId} not found.`
            });
        }

        return res.status(200).json({
            success: true,
            message: `Developer account status changed to ${account_status}.`,
            developer: result.rows[0]
        });

    } catch (error) {
        console.error(
            "Update Developer Account Status Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error. Unable to update developer account status."
        });
    }
};