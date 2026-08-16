import pool from "../../config/database.js";

export const deleteDeveloper = async (req, res) => {
  const { id } = req.params;

  if (isNaN(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid Developer ID." });
  }

  const developerId = parseInt(id, 10);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const devDeleteResult = await client.query(
      `DELETE FROM developers WHERE id = $1 RETURNING *`,
      [developerId],
    );

    if (devDeleteResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, message: "Developer not found." });
    }

    const deletedDev = devDeleteResult.rows[0];
    // Strip sensitive fields like password before sending back
    delete deletedDev.password;

    // 2. Delete from core users table and return email/role info
    const userDeleteResult = await client.query(
      `DELETE FROM users WHERE id = $1 AND role = 'developer' RETURNING id, name, email, role`,
      [developerId],
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: `Developer profile and user account successfully deleted.`,
      deletedData: {
        user: userDeleteResult.rows[0] || null,
        developerProfile: deletedDev,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting developer:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  } finally {
    client.release();
  }
};

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

        // --------------------------------------------------
        // 1. Find client and related user
        // --------------------------------------------------

        const clientResult = await dbClient.query(
            `
                SELECT
                    c.id AS client_id,
                    c.user_id,
                    c.full_name,
                    c.email_address
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

        const client = clientResult.rows[0];
        const userId = client.user_id;


        // --------------------------------------------------
        // 2. Delete the USER
        //
        // Because your database uses CASCADE:
        //
        // users
        //   ↓
        // clients
        //   ↓
        // projects
        // payments
        //
        // and other related records can be deleted
        // automatically.
        // --------------------------------------------------

        const userDeleteResult = await dbClient.query(
            `
                DELETE FROM users
                WHERE id = $1
                  AND role = 'client'
                RETURNING
                    id,
                    name,
                    email,
                    role;
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


        // --------------------------------------------------
        // 3. Commit
        // --------------------------------------------------

        await dbClient.query("COMMIT");


        return res.status(200).json({
            success: true,
            message: "Client account and all associated client data were permanently deleted.",

            deletedData: {
                client: {
                    id: client.client_id,
                    user_id: client.user_id,
                    full_name: client.full_name,
                    email_address: client.email_address
                },

                user: userDeleteResult.rows[0]
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
            message: "Internal server error while deleting client account."
        });

    } finally {
        dbClient.release();
    }
};
export const verifyDeveloper = async (req, res) => {
  const { id } = req.params;
  const { is_verified } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid Developer ID format. Must be an integer.",
    });
  }

  if (typeof is_verified !== "boolean") {
    return res.status(400).json({
      success: false,
      message:
        "Field 'is_verified' is required and must be a boolean (true or false).",
    });
  }

  const developerId = parseInt(id, 10);

  try {
    const queryText = `
            UPDATE developers 
            SET is_verified = $1, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, full_name, email_address, your_domain, tech_stack, is_verified, updated_at;
        `;

    const result = await pool.query(queryText, [is_verified, developerId]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Developer with ID ${developerId} not found.`,
      });
    }

    const actionText = is_verified ? "verified" : "unverified";

    return res.status(200).json({
      success: true,
      message: `Developer profile has been successfully ${actionText}.`,
      developer: result.rows[0],
    });
  } catch (error) {
    console.error("Verify Developer Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Unable to update verification status.",
    });
  }
};

export const toggleDeveloperAccountStatus = async (req, res) => {
  const { id } = req.params;
  const { is_enabled } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid Developer ID format. Must be an integer.",
    });
  }

  if (typeof is_enabled !== "boolean") {
    return res.status(400).json({
      success: false,
      message:
        "Field 'is_enabled' is required and must be a boolean (true or false).",
    });
  }

  const developerId = parseInt(id, 10);

  try {
    const queryText = `
            UPDATE developers 
            SET is_enabled = $1, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, full_name, email_address, your_domain, tech_stack, is_verified, is_enabled, updated_at;
        `;

    const result = await pool.query(queryText, [is_enabled, developerId]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Developer with ID ${developerId} not found.`,
      });
    }

    const statusLabel = is_enabled
      ? "enabled and visible on the platform"
      : "disabled and hidden from the platform";

    return res.status(200).json({
      success: true,
      message: `Developer account successfully ${statusLabel}.`,
      developer: result.rows[0],
    });
  } catch (error) {
    console.error("Toggle Developer Status Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Unable to change account status.",
    });
  }
};
export const getAdminDeveloperById = async (req, res) => {
  const { id } = req.params;

  if (isNaN(Number(id))) {
    return res.status(400).json({
      success: false,
      message: "Invalid developer ID.",
    });
  }

  try {
    const query = `
            SELECT
                id,
                full_name,
                email_address,
                your_domain,
                tech_stack,
                linkdin_url,
                github_url,
                created_at,
                updated_at,
                role,
                is_verified,
                is_enabled,
                bank_name,
                bank_account_title,
                bank_account_number_iban,
                approval_status,
                account_status
            FROM developers
            WHERE id = $1::integer
        `;

    const result = await pool.query(query, [Number(id)]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Developer not found.",
      });
    }

    return res.status(200).json({
      success: true,
      developer: result.rows[0],
    });
  } catch (error) {
    console.error("Get Admin Developer Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
