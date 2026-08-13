import pool from "../../config/database.js";

export const deleteDeveloper = async (req, res) => {
    const { id } = req.params;

    if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid Developer ID." });
    }

    const developerId = parseInt(id, 10);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Delete from developers table and return all deleted developer info
        const devDeleteResult = await client.query(
            `DELETE FROM developers WHERE id = $1 RETURNING *`, 
            [developerId]
        );

        if (devDeleteResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: "Developer not found." });
        }

        const deletedDev = devDeleteResult.rows[0];
        // Strip sensitive fields like password before sending back
        delete deletedDev.password;

        // 2. Delete from core users table and return email/role info
        const userDeleteResult = await client.query(
            `DELETE FROM users WHERE id = $1 AND role = 'developer' RETURNING id, name, email, role`, 
            [developerId]
        );

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: `Developer profile and user account successfully deleted.`,
            deletedData: {
                user: userDeleteResult.rows[0] || null,
                developerProfile: deletedDev
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error deleting developer:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    } finally {
        client.release();
    }
};

export const deleteClient = async (req, res) => {
    const { id } = req.params;

    if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid Client ID." });
    }

    const clientId = parseInt(id, 10);
    const dbClient = await pool.connect();

    try {
        await dbClient.query('BEGIN');

        // 1. Delete from clients table (if separate clients table exists)
        let deletedClientProfile = null;
        const clientDeleteResult = await dbClient.query(
            `DELETE FROM clients WHERE id = $1 RETURNING *`, 
            [clientId]
        );
        if (clientDeleteResult.rowCount > 0) {
            deletedClientProfile = clientDeleteResult.rows[0];
            delete deletedClientProfile.password;
        }

        // 2. Delete from core users table and return deleted details
        const userDeleteResult = await dbClient.query(
            `DELETE FROM users WHERE id = $1 AND role = 'client' RETURNING id, name, email, role, created_at`, 
            [clientId]
        );

        if (userDeleteResult.rowCount === 0) {
            await dbClient.query('ROLLBACK');
            return res.status(404).json({ success: false, message: "Client not found." });
        }

        await dbClient.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: `Client account and associated profile successfully deleted.`,
            deletedData: {
                user: userDeleteResult.rows[0],
                clientProfile: deletedClientProfile
            }
        });

    } catch (error) {
        await dbClient.query('ROLLBACK');
        console.error("Error deleting client:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
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
            message: "Invalid Developer ID format. Must be an integer." 
        });
    }

    if (typeof is_verified !== 'boolean') {
        return res.status(400).json({ 
            success: false, 
            message: "Field 'is_verified' is required and must be a boolean (true or false)." 
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
                message: `Developer with ID ${developerId} not found.` 
            });
        }

        const actionText = is_verified ? "verified" : "unverified";

        return res.status(200).json({
            success: true,
            message: `Developer profile has been successfully ${actionText}.`,
            developer: result.rows[0]
        });

    } catch (error) {
        console.error('Verify Developer Error:', error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error. Unable to update verification status.' 
        });
    }
};

export const toggleDeveloperAccountStatus = async (req, res) => {
    const { id } = req.params;
    const { is_enabled } = req.body;

    if (isNaN(id)) {
        return res.status(400).json({ 
            success: false, 
            message: "Invalid Developer ID format. Must be an integer." 
        });
    }

    if (typeof is_enabled !== 'boolean') {
        return res.status(400).json({ 
            success: false, 
            message: "Field 'is_enabled' is required and must be a boolean (true or false)." 
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
                message: `Developer with ID ${developerId} not found.` 
            });
        }

        const statusLabel = is_enabled ? "enabled and visible on the platform" : "disabled and hidden from the platform";

        return res.status(200).json({
            success: true,
            message: `Developer account successfully ${statusLabel}.`,
            developer: result.rows[0]
        });

    } catch (error) {
        console.error('Toggle Developer Status Error:', error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error. Unable to change account status.' 
        });
    }
};  