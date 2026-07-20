import pool from "../config/database.js";

export const registerChatHandlers = (io, socket) => {
    
    // 1. Join a shared project chat room and load historical records
    socket.on("join_project_chat", async ({ projectId }) => {
        if (!projectId) return;
        
        socket.join(`project_room_${projectId}`);
        console.log(`👥 User [${socket.user?.id}] joined room: project_room_${projectId}`);

        try {
            // Instantly fetch all historical messages for this project
            const queryText = `
                SELECT c.id, c.project_id, c.sender_id, u.name AS sender_name, c.message, c.created_at
                FROM project_chats c
                JOIN users u ON c.sender_id = u.id
                WHERE c.project_id = $1
                ORDER BY c.created_at ASC;
            `;
            const { rows } = await pool.query(queryText, [projectId]);
            
            // Send the historical chat logs directly to the user who just connected
            socket.emit("chat_history", rows);
        } catch (error) {
            console.error("Error loading chat history:", error.message);
        }
    });

    // 2. Receive message, write to DB, and broadcast to the other user
    socket.on("send_message", async (messageData) => {
        const { projectId, message } = messageData;
        const senderId = socket.user?.id; // Extracted directly from secure JWT token payload
        const senderName = socket.user?.name || "User";

        if (!projectId || !message?.trim() || !senderId) return;

        try {
            // Save the message to the database
            const insertQuery = `
                INSERT INTO project_chats (project_id, sender_id, message)
                VALUES ($1, $2, $3)
                RETURNING id, created_at;
            `;
            const { rows } = await pool.query(insertQuery, [projectId, senderId, message.trim()]);
            
            const savedMessagePayload = {
                id: rows[0].id,
                projectId,
                senderId,
                senderName,
                message: message.trim(),
                createdAt: rows[0].created_at
            };

            // Broadcast the message live to everyone else in this project room
            io.to(`project_room_${projectId}`).emit("receive_message", savedMessagePayload);
        } catch (error) {
            console.error("Failed to save message to database:", error.message);
            socket.emit("error", { message: "Message could not be saved to server database." });
        }
    });
};
