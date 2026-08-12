import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../../config/database.js";

const validateUserInput = (name, email, password, role) => {
  if (!name || !email || !password) {
    return "Full name, email, and password fields are strictly required.";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please provide a structurally valid email address.";
  }

  const validRoles = ["client", "developer", "admin"];
  if (role && !validRoles.includes(role.toLowerCase())) {
    return "Invalid account role provided. Must be client, developer, or admin.";
  }
  return null;
};

/**
 * 1. Register User (Client, Developer, or Admin)
 */
export const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  // Validate request body
  const validationError = validateUserInput(name, email, password, role);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const assignedRole = role ? role.trim().toLowerCase() : "client"; // Default to 'client' if not passed

  try {
    // Check if user with given email already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1;",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email address already exists.",
      });
    }

    // Hash the password securely
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user into PostgreSQL database
    const insertQuery = `
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role, created_at;
    `;

    const { rows } = await pool.query(insertQuery, [
      name.trim(),
      normalizedEmail,
      hashedPassword,
      assignedRole,
    ]);

    const newUser = rows[0];

    // Generate JWT token so user is automatically logged in upon registering
    const secretKey =
      process.env.JWT_SECRET || "fallback_development_only_secret_key";
    const sessionExpiry = process.env.JWT_EXPIRES_IN || "8h";

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      secretKey,
      { expiresIn: sessionExpiry }
    );

    return res.status(201).json({
      success: true,
      message: "User registered successfully.",
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Registration Error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "An internal server error occurred." });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Email and password are required fields.",
      });
  }

  try {
    const userResult = await pool.query(
      "SELECT id, name, email, password, role FROM users WHERE email = $1;",
      [email.trim().toLowerCase()],
    );
    if (userResult.rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    const user = userResult.rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    const secretKey =
      process.env.JWT_SECRET || "fallback_development_only_secret_key";
    const sessionExpiry = process.env.JWT_EXPIRES_IN || "8h";

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secretKey,
      { expiresIn: sessionExpiry },
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "An internal server error occurred." });
  }
};

export const getCurrentUser = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res
      .status(401)
      .json({
        success: false,
        message: "Access denied. Context tracking properties missing.",
      });
  }

  try {
    const userResult = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = $1;",
      [userId],
    );
    if (userResult.rows.length === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "User reference context could not be located.",
        });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: userResult.rows[0].id,
        name: userResult.rows[0].name,
        email: userResult.rows[0].email,
        role: userResult.rows[0].role,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "An internal server error occurred." });
  }
};