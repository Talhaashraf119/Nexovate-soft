import bcrypt from 'bcryptjs';
import pool from '../../config/database.js';

// --- Input Validation Utility ---
const validateProfileInput = (body, isUpdate = false) => {
    const { full_Name, email_address, password, your_domain, Tech_stack } = body;

    if (!isUpdate) {
        if (!full_Name || !email_address || !password || !your_domain || !Tech_stack) {
            return "full_Name, email_address, password, your_domain, and Tech_stack are strictly required.";
        }
        if (password.length < 8) {
            return "Password must be at least 8 characters long.";
        }
    } else {
        if (password !== undefined && password.length < 8) {
            return "Updated password must be at least 8 characters long.";
        }
    }

    if (email_address) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email_address)) {
            return "Please provide a valid email address structure.";
        }
    }

    return null;
};

// --- CREATE DEVELOPER (With Safe Dual-Table SQL Transaction) ---
export const createDeveloper = async (req, res) => {
    const validationError = validateProfileInput(req.body, false);
    if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
    }

    const { full_Name, email_address, password, your_domain, Tech_stack, Linkdin_URL, Github_URL } = req.body;
    const client = await pool.connect();

    try {
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const formattedEmail = email_address.trim().toLowerCase();

        await client.query('BEGIN');

        // Step 1: Insert core login credentials into 'users'
        const userQuery = `
            INSERT INTO users (name, email, password, role)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
        `;
        const userResult = await client.query(userQuery, [
            full_Name.trim(),
            formattedEmail,
            hashedPassword,
            'developer'
        ]);

        const newUserId = userResult.rows[0].id;

        // Step 2: Insert detailed profile into 'developers' utilizing the same ID mapping
        const developerQuery = `
            INSERT INTO developers (id, full_name, email_address, password, your_domain, tech_stack, linkdin_url, github_url, role) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING id, full_name, email_address, your_domain, tech_stack, linkdin_url, github_url, role, created_at;
        `;
        
        const developerValues = [
            newUserId,
            full_Name.trim(), 
            formattedEmail, 
            hashedPassword, 
            your_domain.trim(), 
            Tech_stack, 
            Linkdin_URL || null, 
            Github_URL || null,
            'developer' 
        ];

        const developerResult = await client.query(developerQuery, developerValues);

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: "New Developer Profile & User Account Created Successfully",
            developer: developerResult.rows[0] 
        });

    } catch (error) {
        await client.query('ROLLBACK');

        if (error.code === '23505') {
            return res.status(409).json({ 
                success: false,
                message: "A profile with this email address, LinkedIn, or GitHub URL already exists." 
            });
        }

        console.error('Create Developer Error:', error.message);
        return res.status(500).json({ 
            success: false,
            message: 'Internal Server Error. Please try again later.' 
        });
    } finally {
        client.release();
    }
};

// --- GET ALL DEVELOPERS ---
export const getAllDeveloper = async (req, res) => {
    try {
        const queryText = `
            SELECT id, full_name, email_address, your_domain, tech_stack, linkdin_url, github_url, role, created_at 
            FROM developers 
            ORDER BY id DESC;
        `;
        
        const result = await pool.query(queryText);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error('Get All Developers Error:', error.message);
        return res.status(500).json({ 
            success: false,
            message: 'Internal server error. Unable to fetch developers.' 
        });
    }
};

// --- GET DEVELOPER BY ID ---
export const getDeveloperById = async (req, res) => {
    const developerId = req.params.id;

    if (isNaN(Number(developerId))) {
        return res.status(400).json({
            success: false,
            message: "Bad Request: Invalid ID format. ID must be a number."
        });
    }

    try {
        const queryText = `
            SELECT id, full_name, email_address, your_domain, tech_stack, linkdin_url, github_url, role, created_at 
            FROM developers 
            WHERE id = $1;
        `;
        
        const result = await pool.query(queryText, [developerId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: `Developer with ID ${developerId} not found.` 
            });
        }
        
        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Get Developer By ID Error:', error.message);
        return res.status(500).json({ 
            success: false,
            message: 'Internal server error. Unable to retrieve developer profile.' 
        });
    }
};

// --- UPDATE DEVELOPER (With Safe Dual-Table SQL Transaction) ---
export const updateDeveloper = async (req, res) => {
    const developerId = req.params.id;
    if (isNaN(Number(developerId))) {
        return res.status(400).json({ success: false, message: "Invalid ID format." });
    }

    if (Object.keys(req.body).length === 0) {
        return res.status(400).json({ success: false, message: "No fields provided for update." });
    }

    const validationError = validateProfileInput(req.body, true);
    if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
    }

    const { full_Name, email_address, password, your_domain, Tech_stack, Linkdin_URL, Github_URL, role } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Step 1: Update fields inside the 'users' table (Auth table)
        const userQueryParts = [];
        const userValues = [];
        let userPlaceholderIndex = 1;

        if (full_Name !== undefined) {
            userQueryParts.push(`name = $${userPlaceholderIndex++}`);
            userValues.push(full_Name.trim());
        }
        if (email_address !== undefined) {
            userQueryParts.push(`email = $${userPlaceholderIndex++}`);
            userValues.push(email_address.trim().toLowerCase());
        }
        if (password !== undefined) {
            const hashed = await bcrypt.hash(password, 12);
            userQueryParts.push(`password = $${userPlaceholderIndex++}`);
            userValues.push(hashed);
        }
        if (role !== undefined) {
            userQueryParts.push(`role = $${userPlaceholderIndex++}`);
            userValues.push(role);
        }

        // Only fire 'users' update query if there are auth changes
        if (userQueryParts.length > 0) {
            userValues.push(developerId);
            const userQueryText = `
                UPDATE users 
                SET ${userQueryParts.join(', ')} 
                WHERE id = $${userPlaceholderIndex};
            `;
            const userUpdateResult = await client.query(userQueryText, userValues);
            if (userUpdateResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, message: `User record with ID ${developerId} not found.` });
            }
        }

        // Step 2: Update fields inside the 'developers' table
        const devQueryParts = [];
        const devValues = [];
        let devPlaceholderIndex = 1;

        if (full_Name !== undefined) {
            devQueryParts.push(`full_name = $${devPlaceholderIndex++}`);
            devValues.push(full_Name.trim());
        }
        if (email_address !== undefined) {
            devQueryParts.push(`email_address = $${devPlaceholderIndex++}`);
            devValues.push(email_address.trim().toLowerCase());
        }
        if (password !== undefined) {
            const hashed = await bcrypt.hash(password, 12);
            devQueryParts.push(`password = $${devPlaceholderIndex++}`);
            devValues.push(hashed);
        }
        if (your_domain !== undefined) {
            devQueryParts.push(`your_domain = $${devPlaceholderIndex++}`);
            devValues.push(your_domain.trim());
        }
        if (Tech_stack !== undefined) {
            devQueryParts.push(`tech_stack = $${devPlaceholderIndex++}`);
            devValues.push(Tech_stack);
        }
        if (Linkdin_URL !== undefined) {
            devQueryParts.push(`linkdin_url = $${devPlaceholderIndex++}`);
            devValues.push(Linkdin_URL || null);
        }
        if (Github_URL !== undefined) {
            devQueryParts.push(`github_url = $${devPlaceholderIndex++}`);
            devValues.push(Github_URL || null);
        }
        if (role !== undefined) {
            devQueryParts.push(`role = $${devPlaceholderIndex++}`);
            devValues.push(role);
        }

        let updatedDeveloperRecord = null;

        if (devQueryParts.length > 0) {
            devValues.push(developerId);
            const devQueryText = `
                UPDATE developers 
                SET ${devQueryParts.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${devPlaceholderIndex} 
                RETURNING id, full_name, email_address, your_domain, tech_stack, linkdin_url, github_url, role, updated_at;
            `;
            const devUpdateResult = await client.query(devQueryText, devValues);
            if (devUpdateResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, message: `Developer profile with ID ${developerId} not found.` });
            }
            updatedDeveloperRecord = devUpdateResult.rows[0];
        }

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: "Developer updated successfully on both credential and profile levels.",
            developer: updatedDeveloperRecord
        });

    } catch (error) {
        await client.query('ROLLBACK');

        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                message: "Conflict: This Email, LinkedIn, or GitHub link is already registered."
            });
        }
        
        console.error('Update Developer Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error. Unable to update developer profile.'
        });
    } finally {
        client.release();
    }
};