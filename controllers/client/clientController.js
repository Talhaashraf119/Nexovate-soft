import bcrypt from 'bcryptjs';
import pool from '../../config/database.js';

const validateClientInput = (body, isUpdate = false) => {
    const { full_Name, email_address, password } = body;

    if (!isUpdate) {
        if (!full_Name || !email_address || !password) {
            return "full_Name, email_address, and password are strictly required.";
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

export const createClient = async (req, res) => {
    const validationError = validateClientInput(req.body, false);
    if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
    }

    const { full_Name, email_address, password } = req.body;
    
    const dbClient = await pool.connect();

    try {
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const normalizedEmail = email_address.trim().toLowerCase();
        const trimmedName = full_Name.trim();

        await dbClient.query('BEGIN');

        const userQuery = `
            INSERT INTO users (name, email, password, role)
            VALUES ($1, $2, $3, 'client')
            RETURNING id, name, email, role, created_at;
        `;
        const userResult = await dbClient.query(userQuery, [trimmedName, normalizedEmail, hashedPassword]);
        const newUser = userResult.rows[0];

        const clientQuery = `
            INSERT INTO clients (user_id, full_name, email_address, password, role)
            VALUES ($1, $2, $3, $4, 'client')
            RETURNING id, user_id, full_name, email_address, role, created_at;
        `;
        const clientResult = await dbClient.query(clientQuery, [newUser.id, trimmedName, normalizedEmail, hashedPassword,]);
        
        await dbClient.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: "New Client Account and Profile Created Successfully",
            authAccount: newUser,
            profile: clientResult.rows[0]
        });

    } catch (error) {
        await dbClient.query('ROLLBACK');

        if (error.code === '23505') {
            return res.status(409).json({ success: false, message: "A profile with this email address already exists." });
        }
        console.error('Create Client Transaction Error:', error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    } finally {
        dbClient.release();
    }
};

export const updateClient = async (req, res) => {
  const clientId = req.params.id;

  if (isNaN(Number(clientId))) {
    return res.status(400).json({ success: false, message: "Invalid ID format." });
  }

  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({ success: false, message: "No fields provided for update." });
  }

  const validationError = validateClientInput(req.body, true);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  // Destructure the new banking and contact fields alongside the existing ones
  const { 
    full_Name, 
    email_address, 
    password, 
    phone, 
    account_title, 
    bank_name, 
    account_number 
  } = req.body;

  const dbClient = await pool.connect();

  try {
    await dbClient.query('BEGIN');

    // Check if the client profile exists
    const existingClientRes = await dbClient.query("SELECT user_id FROM clients WHERE id = $1;", [clientId]);
    if (existingClientRes.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return res.status(404).json({ success: false, message: `Client profile with ID ${clientId} not found.` });
    }

    const userId = existingClientRes.rows[0].user_id;

    const clientParts = [];
    const clientValues = [];
    let cIdx = 1;

    const userParts = [];
    const userValues = [];
    let uIdx = 1;

    // --- Core Profile Fields ---
    if (full_Name) {
      clientParts.push(`full_name = $${cIdx++}`);
      clientValues.push(full_Name.trim());
      userParts.push(`name = $${uIdx++}`);
      userValues.push(full_Name.trim());
    }

    if (email_address) {
      const cleanEmail = email_address.trim().toLowerCase();
      clientParts.push(`email_address = $${cIdx++}`);
      clientValues.push(cleanEmail);
      userParts.push(`email = $${uIdx++}`);
      userValues.push(cleanEmail);
    }

    if (password) {
      const hashed = await bcrypt.hash(password, 12);
      clientParts.push(`password = $${cIdx++}`);
      clientValues.push(hashed);
      userParts.push(`password = $${uIdx++}`);
      userValues.push(hashed);
    }

    // --- New Banking & Contact Fields (Saves if empty, updates if already exists) ---
    if (phone) {
      clientParts.push(`phone = $${cIdx++}`);
      clientValues.push(phone.trim());
    }

    if (account_title) {
      clientParts.push(`account_title = $${cIdx++}`);
      clientValues.push(account_title.trim());
    }

    if (bank_name) {
      clientParts.push(`bank_name = $${cIdx++}`);
      clientValues.push(bank_name.trim());
    }

    if (account_number) {
      clientParts.push(`account_number = $${cIdx++}`);
      clientValues.push(account_number.trim());
    }

    // --- Execute Updates ---
    if (clientParts.length > 0) {
      clientValues.push(clientId);
      await dbClient.query(`UPDATE clients SET ${clientParts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${cIdx}`, clientValues);
    }

    if (userParts.length > 0) {
      userValues.push(userId);
      await dbClient.query(`UPDATE users SET ${userParts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${uIdx}`, userValues);
    }

    // Fetch the updated profile including the new fields to return to the client
    const profileResult = await dbClient.query(
      `SELECT id, user_id, full_name, email_address, phone, account_title, bank_name, account_number, role, updated_at 
       FROM clients WHERE id = $1;`, 
      [clientId]
    );

    await dbClient.query('COMMIT');
    return res.status(200).json({ success: true, message: "Client profile updated successfully", client: profileResult.rows[0] });

  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Update Client Error Details:', error.message);
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: "Conflict: This Email is already registered by another account." });
    }
    return res.status(500).json({ success: false, message: 'Internal server error. Unable to update client profile.' });
  } finally {
    dbClient.release();
  }
};
;




export const getAllClients = async (req, res) => {
    try {
        const result = await pool.query("SELECT id, user_id, full_name, email_address, role, created_at FROM clients ORDER BY id DESC;");
        return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        console.error('Get All Clients Error:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error. Unable to fetch clients.' });
    }
};

export const getClientById = async (req, res) => {
    const clientId = req.params.id;
    if (isNaN(Number(clientId))) {
        return res.status(400).json({ success: false, message: "Bad Request: Invalid ID format. ID must be a number." });
    }
    try {
        const result = await pool.query("SELECT id, user_id, full_name, email_address, role, created_at FROM clients WHERE id = $1;", [clientId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: `Client with ID ${clientId} not found.` });
        }
        return res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Get Client By ID Error:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error. Unable to retrieve client profile.' });
    }
};
