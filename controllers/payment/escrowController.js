import pool from "../../config/database.js";

/**
 * 12. Client Makes Payment (Funds Held in Escrow)
 * POST /payments/deposit
 */
export const clientDepositEscrow = async (req, res) => {
    const { projectId, amount, transactionRef } = req.body;
    const clientId = req.user.id; // Extracted from auth middleware

    if (!projectId || !amount || amount <= 0) {
        return res.status(400).json({ success: false, message: "Valid project ID and amount are required." });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Verify project exists and belongs to this client
        const projectRes = await client.query(
            `SELECT id, developer_id, status FROM projects WHERE id = $1 AND client_id = $2`,
            [projectId, clientId]
        );

        if (projectRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: "Project not found or not assigned to you." });
        }

        const project = projectRes.rows[0];

        if (!project.developer_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: "Cannot deposit funds. No developer assigned to this project yet." });
        }

        // Prevent duplicate active payments for the same project
        const existingPayment = await client.query(
            `SELECT id FROM payments WHERE project_id = $1 AND status IN ('held', 'verified')`,
            [projectId]
        );

        if (existingPayment.rowCount > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: "An active escrow payment already exists for this project." });
        }

        // Insert payment with status 'held'
        const insertQuery = `
            INSERT INTO payments (project_id, client_id, developer_id, amount, transaction_ref, status)
            VALUES ($1, $2, $3, $4, $5, 'held')
            RETURNING id, project_id, amount, status, transaction_ref, created_at;
        `;
        const paymentRes = await client.query(insertQuery, [
            projectId,
            clientId,
            project.developer_id,
            amount,
            transactionRef || `TXN_${Date.now()}`
        ]);

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: "Payment received and safely held in platform escrow.",
            payment: paymentRes.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Escrow Deposit Error:", error);
        return res.status(500).json({ success: false, message: "Failed to process escrow deposit." });
    } finally {
        client.release();
    }
};

/**
 * 13 & 14. Admin Verifies Project & Escrow Payment
 * PATCH /admin/payments/:paymentId/verify
 */
export const adminVerifyPayment = async (req, res) => {
    const { paymentId } = req.params;
    const adminId = req.user.id;

    if (isNaN(paymentId)) {
        return res.status(400).json({ success: false, message: "Invalid payment ID." });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check payment status
        const paymentRes = await client.query(
            `SELECT p.id, p.project_id, p.status, pr.status AS project_status 
             FROM payments p
             JOIN projects pr ON p.project_id = pr.id
             WHERE p.id = $1 FOR UPDATE`,
            [paymentId]
        );

        if (paymentRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: "Escrow payment record not found." });
        }

        const payment = paymentRes.rows[0];

        if (payment.status !== 'held') {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: `Payment is already in '${payment.status}' status.` });
        }

        // Verify escrow status transition
        const updateQuery = `
            UPDATE payments 
            SET status = 'verified', 
                verified_by_admin_id = $1, 
                verified_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 
            RETURNING id, project_id, amount, status, verified_at;
        `;

        const updatedPayment = await client.query(updateQuery, [adminId, paymentId]);

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: "Project work and payment successfully verified by Admin.",
            payment: updatedPayment.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Admin Payment Verification Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error during payment verification." });
    } finally {
        client.release();
    }
};

/**
 * Admin Releases Escrow Funds to Developer
 * PATCH /admin/payments/:paymentId/release
 */
export const adminReleasePayment = async (req, res) => {
    const { paymentId } = req.params;

    if (isNaN(paymentId)) {
        return res.status(400).json({ success: false, message: "Invalid payment ID." });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const paymentRes = await client.query(
            `SELECT id, project_id, developer_id, amount, status FROM payments WHERE id = $1 FOR UPDATE`,
            [paymentId]
        );

        if (paymentRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: "Payment record not found." });
        }

        const payment = paymentRes.rows[0];

        if (payment.status !== 'verified') {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                message: `Payment must be 'verified' before release. Current status is '${payment.status}'.` 
            });
        }

        // Mark payment as released
        const updateQuery = `
            UPDATE payments 
            SET status = 'released', 
                released_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 
            RETURNING id, project_id, developer_id, amount, status, released_at;
        `;

        const releasedPayment = await client.query(updateQuery, [paymentId]);

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: "Escrow funds successfully released to developer.",
            payment: releasedPayment.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Admin Payment Release Error:", error);
        return res.status(500).json({ success: false, message: "Failed to release funds." });
    } finally {
        client.release();
    }
};
export const getUserTransactionHistory = async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role; // 'client' or 'developer'

    try {
        let historyQuery = '';
        
        if (userRole === 'client') {
            historyQuery = `
                SELECT 
                    p.id AS payment_id,
                    p.project_id,
                    pr.projectname AS project_name,
                    u_dev.name AS developer_name,
                    p.amount,
                    p.status,
                    p.transaction_ref,
                    p.created_at AS deposited_at,
                    p.released_at
                FROM payments p
                JOIN projects pr ON p.project_id = pr.id
                LEFT JOIN users u_dev ON p.developer_id = u_dev.id
                WHERE p.client_id = $1
                ORDER BY p.created_at DESC;
            `;
        } else if (userRole === 'developer') {
            historyQuery = `
                SELECT 
                    p.id AS payment_id,
                    p.project_id,
                    pr.projectname AS project_name,
                    u_client.name AS client_name,
                    p.amount,
                    p.status,
                    p.transaction_ref,
                    p.created_at AS deposited_at,
                    p.released_at
                FROM payments p
                JOIN projects pr ON p.project_id = pr.id
                LEFT JOIN users u_client ON p.client_id = u_client.id
                WHERE p.developer_id = $1
                ORDER BY p.created_at DESC;
            `;
        } else {
            return res.status(403).json({ success: false, message: "Use the admin endpoint for platform transaction history." });
        }

        const { rows } = await pool.query(historyQuery, [userId]);

        return res.status(200).json({
            success: true,
            totalTransactions: rows.length,
            data: rows
        });

    } catch (error) {
        console.error("Error fetching user transaction history:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

/**
 * View Platform-Wide Transaction History (Admin Only)
 * GET /payments/admin/history
 */
export const getAdminTransactionHistory = async (req, res) => {
    try {
        const adminQuery = `
            SELECT 
                p.id AS payment_id,
                p.project_id,
                pr.projectname AS project_name,
                p.client_id,
                u_client.name AS client_name,
                p.developer_id,
                u_dev.name AS developer_name,
                p.amount,
                p.status,
                p.transaction_ref,
                u_admin.name AS verified_by_admin,
                p.verified_at,
                p.released_at,
                p.created_at AS deposited_at
            FROM payments p
            JOIN projects pr ON p.project_id = pr.id
            LEFT JOIN users u_client ON p.client_id = u_client.id
            LEFT JOIN users u_dev ON p.developer_id = u_dev.id
            LEFT JOIN users u_admin ON p.verified_by_admin_id = u_admin.id
            ORDER BY p.created_at DESC;
        `;

        const { rows } = await pool.query(adminQuery);

        return res.status(200).json({
            success: true,
            totalTransactions: rows.length,
            data: rows
        });

    } catch (error) {
        console.error("Error fetching admin transaction history:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};