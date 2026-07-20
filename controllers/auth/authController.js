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
