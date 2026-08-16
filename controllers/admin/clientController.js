import pool from "../../config/database.js";


// =====================================================
// GET ALL CLIENTS
// =====================================================

export const getAllClients = async (req, res) => {

    try {

        const query = `
            SELECT
                c.id AS client_id,
                c.user_id,

                c.full_name,
                c.email_address,
                c.phone,

                c.account_title,
                c.bank_name,
                c.account_number,

                c.created_at,
                c.updated_at,

                u.account_status

            FROM clients c

            INNER JOIN users u
                ON u.id = c.user_id

            WHERE u.role = 'client'

            ORDER BY c.created_at DESC;
        `;

        const result = await pool.query(query);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            clients: result.rows
        });

    } catch (error) {

        console.error(
            "Get All Clients Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error while retrieving clients."
        });
    }
};



// =====================================================
// GET CLIENT BY ID
// =====================================================

export const getClientById = async (req, res) => {

    const { id } = req.params;

    if (isNaN(Number(id))) {

        return res.status(400).json({
            success: false,
            message: "Invalid Client ID."
        });
    }

    const clientId = Number(id);

    try {

        const query = `
            SELECT
                c.id AS client_id,
                c.user_id,

                c.full_name,
                c.email_address,
                c.phone,

                c.account_title,
                c.bank_name,
                c.account_number,

                c.created_at,
                c.updated_at,

                u.account_status

            FROM clients c

            INNER JOIN users u
                ON u.id = c.user_id

            WHERE c.id = $1
              AND u.role = 'client';
        `;

        const result = await pool.query(
            query,
            [clientId]
        );

        if (result.rowCount === 0) {

            return res.status(404).json({
                success: false,
                message: "Client not found."
            });
        }

        return res.status(200).json({
            success: true,
            client: result.rows[0]
        });

    } catch (error) {

        console.error(
            "Get Client By ID Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error while retrieving client."
        });
    }
};



// =====================================================
// UPDATE CLIENT ACCOUNT STATUS
// =====================================================

export const updateClientAccountStatus = async (req, res) => {

    const { id } = req.params;
    const { account_status } = req.body;

    if (isNaN(Number(id))) {

        return res.status(400).json({
            success: false,
            message: "Invalid Client ID."
        });
    }

    const allowedStatuses = [
        "active",
        "suspended",
        "blocked"
    ];

    if (
        !account_status ||
        !allowedStatuses.includes(account_status)
    ) {

        return res.status(400).json({
            success: false,
            message: "account_status must be active, suspended, or blocked."
        });
    }

    const clientId = Number(id);

    try {

        /*
         * First get the user_id belonging to this client.
         */

        const clientResult = await pool.query(
            `
                SELECT
                    c.user_id
                FROM clients c
                INNER JOIN users u
                    ON u.id = c.user_id
                WHERE c.id = $1
                  AND u.role = 'client';
            `,
            [clientId]
        );

        if (clientResult.rowCount === 0) {

            return res.status(404).json({
                success: false,
                message: "Client not found."
            });
        }

        const userId = clientResult.rows[0].user_id;


        /*
         * Update authentication account status.
         */

        const updateQuery = `
            UPDATE users
            SET
                account_status = $1::varchar,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2::integer
              AND role = 'client'

            RETURNING
                id,
                name,
                email,
                role,
                account_status,
                updated_at;
        `;

        const result = await pool.query(
            updateQuery,
            [
                account_status,
                userId
            ]
        );

        if (result.rowCount === 0) {

            return res.status(404).json({
                success: false,
                message: "Client user account not found."
            });
        }

        return res.status(200).json({

            success: true,

            message:
                `Client account successfully changed to ${account_status}.`,

            client: result.rows[0]
        });

    } catch (error) {

        console.error(
            "Update Client Account Status Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error while updating client account status."
        });
    }
};



// =====================================================
// DELETE CLIENT
// =====================================================

export const deleteClient = async (req, res) => {

    const { id } = req.params;

    if (isNaN(Number(id))) {

        return res.status(400).json({
            success: false,
            message: "Invalid Client ID."
        });
    }

    const clientId = Number(id);

    const dbClient = await pool.connect();

    try {

        await dbClient.query("BEGIN");


        /*
         * Find the user's ID first.
         */

        const clientResult = await dbClient.query(
            `
                SELECT
                    c.user_id,
                    c.id AS client_id
                FROM clients c
                INNER JOIN users u
                    ON u.id = c.user_id
                WHERE c.id = $1
                  AND u.role = 'client';
            `,
            [clientId]
        );

        if (clientResult.rowCount === 0) {

            await dbClient.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Client not found."
            });
        }

        const userId = clientResult.rows[0].user_id;


        /*
         * Delete client profile.
         */

        const clientDeleteResult = await dbClient.query(
            `
                DELETE FROM clients
                WHERE id = $1
                RETURNING id, full_name, email_address;
            `,
            [clientId]
        );


        /*
         * Delete authentication account.
         */

        const userDeleteResult = await dbClient.query(
            `
                DELETE FROM users
                WHERE id = $1
                  AND role = 'client'
                RETURNING id, name, email, role;
            `,
            [userId]
        );


        if (userDeleteResult.rowCount === 0) {

            await dbClient.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Client user account not found."
            });
        }


        await dbClient.query("COMMIT");


        return res.status(200).json({

            success: true,

            message:
                "Client account and profile successfully deleted.",

            deletedData: {

                client:
                    clientDeleteResult.rows[0] || null,

                user:
                    userDeleteResult.rows[0] || null
            }
        });

    } catch (error) {

        await dbClient.query("ROLLBACK");

        console.error(
            "Delete Client Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error while deleting client."
        });

    } finally {

        dbClient.release();
    }
};