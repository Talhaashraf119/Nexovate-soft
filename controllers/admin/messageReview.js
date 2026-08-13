import pool from "../../config/database.js";

export const getAllProjectChatSummaries = async (req, res) => {
    try {
        const queryText = `
            SELECT 
                p.id AS project_id,
                p.projectname AS project_name,
                COUNT(c.id)::INT AS total_messages,
                MAX(c.created_at) AS last_message_at
            FROM projects p
            LEFT JOIN project_chats c ON p.id = c.project_id
            GROUP BY p.id, p.projectname
            ORDER BY last_message_at DESC NULLS LAST;
        `;
        
        const { rows } = await pool.query(queryText);
        
        return res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error("Error fetching chat summaries:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
export const getAdminProjectChatHistory = async (req, res) => {
    console.log("--> getAdminProjectChatHistory called!");
    console.log("--> req.params:", req.params);
    console.log("--> req.originalUrl:", req.originalUrl);
    const { projectId } = req.params;

    if (isNaN(projectId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid project ID. Must be a numeric integer."
        });
    }

    const numericProjectId = parseInt(projectId, 10);
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = (page - 1) * limit;

    try {
        const queryText = `
            SELECT 
                c.id, 
                c.project_id, 
                c.sender_id, 
                u.name AS sender_name,
                u.role AS sender_role,
                c.message, 
                c.created_at
            FROM project_chats c
            JOIN users u ON c.sender_id = u.id
            WHERE c.project_id = $1
            ORDER BY c.created_at ASC
            LIMIT $2 OFFSET $3;
        `;

        const countQuery = `SELECT COUNT(*) FROM project_chats WHERE project_id = $1;`;

        const [{ rows: messages }, { rows: countResult }] = await Promise.all([
            pool.query(queryText, [numericProjectId, limit, offset]),
            pool.query(countQuery, [numericProjectId])
        ]);

        const totalMessages = parseInt(countResult[0].count, 10);

        return res.status(200).json({
            success: true,
            pagination: {
                totalMessages,
                currentPage: page,
                totalPages: Math.ceil(totalMessages / limit),
                limit
            },
            data: messages
        });
    } catch (error) {
        console.error("Error fetching project chat history:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};