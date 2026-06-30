import bcrypt from 'bcryptjs';
import pool from '../config/database.js';

const validateProfileInput = (body, isUpdate = false) => {
    const { full_Name, email_address, password, your_domain, Tech_stack, Linkdin_URL, Github_URL } = body;

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

export const createDeveloper = async (req, res) => {
    const validationError = validateProfileInput(req.body, false);
    if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
    }

    const { full_Name, email_address, password, your_domain, Tech_stack, Linkdin_URL, Github_URL } = req.body;

    try {
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const queryText = `
            INSERT INTO developers (full_name, email_address, password, your_domain, tech_stack, linkdin_url, github_url) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING id, full_name, email_address, your_domain, tech_stack, linkdin_url, github_url, created_at;
        `;
        
        const values = [
            full_Name.trim(), 
            email_address.trim().toLowerCase(), 
            hashedPassword, 
            your_domain.trim(), 
            Tech_stack, 
            Linkdin_URL || null, 
            Github_URL || null
        ];

        const result = await pool.query(queryText, values);

        return res.status(201).json({
            success: true,
            message: "New Developer Profile Created Successfully",
            developer: result.rows[0] 
        });

    } catch (error) {
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
    }
};

export const getAllDeveloper = async (req, res) => {
    try {
        const queryText = `
            SELECT id, full_name, email_address, your_domain, tech_stack, linkdin_url, github_url, created_at 
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
            SELECT id, full_name, email_address, your_domain, tech_stack, linkdin_url, github_url, created_at 
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

/**
 * Dynamically Update a Developer Profile
 */
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

    const { full_Name, email_address, password, your_domain, Tech_stack, Linkdin_URL, Github_URL } = req.body;

    try {
        const queryParts = [];
        const values = [];
        let placeholderIndex = 1;

        const fieldMappings = {
            full_name: full_Name,
            email_address: email_address ? email_address.trim().toLowerCase() : undefined,
            password: password ? await bcrypt.hash(password, 12) : undefined, // Securely re-hash if updated
            your_domain: your_domain,
            tech_stack: Tech_stack,
            linkdin_url: Linkdin_URL,
            github_url: Github_URL
        };

        for (const [columnName, value] of Object.entries(fieldMappings)) {
            if (value !== undefined) {
                queryParts.push(`${columnName} = $${placeholderIndex}`);
                values.push(value);
                placeholderIndex++;
            }
        }

        values.push(developerId);
        const idPlaceholder = `$${placeholderIndex}`;

        const queryText = `
            UPDATE developers 
            SET ${queryParts.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${idPlaceholder} 
            RETURNING id, full_name, email_address, your_domain, tech_stack, linkdin_url, github_url, updated_at;
        `;

        const result = await pool.query(queryText, values);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Developer with ID ${developerId} not found.`
            });
        }

        return res.status(200).json({
            success: true,
            message: "Developer updated successfully",
            developer: result.rows[0]
        });

    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                message: "Conflict: This Email, LinkedIn, or GitHub link is already registered."
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Internal server error. Unable to update developer profile.'
        });
    }
};
