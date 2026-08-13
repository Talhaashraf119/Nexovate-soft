import pool from '../../config/database.js';

export const setPlatformCommission = async (req, res) => {
    const { commission_percentage } = req.body;

    const commissionNum = parseFloat(commission_percentage);
    if (isNaN(commissionNum) || commissionNum < 0 || commissionNum > 100) {
        return res.status(400).json({
            success: false,
            message: "Validation Error: 'commission_percentage' must be a valid percentage between 0 and 100."
        });
    }

    try {
        const queryText = `
            INSERT INTO platform_settings (key, value, updated_at)
            VALUES ('commission_percentage', $1, CURRENT_TIMESTAMP)
            ON CONFLICT (key) 
            DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
            RETURNING key, value, updated_at;
        `;

        const { rows } = await pool.query(queryText, [commissionNum.toString()]);

        return res.status(200).json({
            success: true,
            message: `Platform commission percentage updated successfully to ${commissionNum}%.`,
            setting: rows[0]
        });

    } catch (error) {
        console.error('Set Commission Error:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

export const setMinWithdrawalAmount = async (req, res) => {
    const { min_withdrawal_amount } = req.body;

    const minAmountNum = parseFloat(min_withdrawal_amount);
    if (isNaN(minAmountNum) || minAmountNum <= 0) {
        return res.status(400).json({
            success: false,
            message: "Validation Error: 'min_withdrawal_amount' must be a positive number greater than 0."
        });
    }

    try {
        const queryText = `
            INSERT INTO platform_settings (key, value, updated_at)
            VALUES ('min_withdrawal_amount', $1, CURRENT_TIMESTAMP)
            ON CONFLICT (key) 
            DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
            RETURNING key, value, updated_at;
        `;

        const { rows } = await pool.query(queryText, [minAmountNum.toString()]);

        return res.status(200).json({
            success: true,
            message: `Minimum withdrawal threshold updated successfully to $${minAmountNum}.`,
            setting: rows[0]
        });

    } catch (error) {
        console.error('Set Min Withdrawal Error:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};
export const getPlatformSettings = async (req, res) => {
    try {
        const queryText = `SELECT key, value, updated_at FROM platform_settings;`;
        const { rows } = await pool.query(queryText);

        const settingsMap = {};
        rows.forEach(row => {
            settingsMap[row.key] = parseFloat(row.value);
        });

        return res.status(200).json({
            success: true,
            settings: settingsMap,
            raw: rows
        });
    } catch (error) {
        console.error('Get Settings Error:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};