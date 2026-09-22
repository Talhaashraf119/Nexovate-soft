import pool from "../config/database.js";

export const registerChatHandlers = (io, socket) => {

    /*
    |--------------------------------------------------------------------------
    | JOIN PROJECT CHAT
    |--------------------------------------------------------------------------
    */

    socket.on("join_project_chat", async ({ projectId }) => {

        if (!projectId) {
            return;
        }

        const roomName = `project_room_${projectId}`;

        try {

            /*
            |--------------------------------------------------------------------------
            | Check that project exists
            |--------------------------------------------------------------------------
            */

            const projectCheck = await pool.query(
                `
                SELECT
                    id,
                    client_id,
                    developer_id
                FROM projects
                WHERE id = $1
                LIMIT 1;
                `,
                [projectId]
            );

            if (projectCheck.rows.length === 0) {

                socket.emit("chat_error", {
                    message: "Project not found."
                });

                return;
            }

            const project = projectCheck.rows[0];

            /*
            |--------------------------------------------------------------------------
            | Authorization
            |--------------------------------------------------------------------------
            */

            const userId = Number(socket.user?.id);

            const isClient =
                Number(project.client_id) === userId;

            const isDeveloper =
                project.developer_id &&
                Number(project.developer_id) === userId;

            const isAdmin =
                socket.user?.role?.toLowerCase() === "admin";

            if (!isClient && !isDeveloper && !isAdmin) {

                socket.emit("chat_error", {
                    message:
                        "You are not authorized to access this project chat."
                });

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | Join room
            |--------------------------------------------------------------------------
            */

            socket.join(roomName);

            console.log(
                `👥 User [${userId}] joined ${roomName}`
            );

            /*
            |--------------------------------------------------------------------------
            | Load chat history
            |--------------------------------------------------------------------------
            */

            const queryText = `
                SELECT
                    c.id,
                    c.project_id,
                    c.sender_id,
                    u.name AS sender_name,
                    c.message,
                    c.created_at
                FROM project_chats c
                JOIN users u
                    ON c.sender_id = u.id
                WHERE c.project_id = $1
                ORDER BY c.created_at ASC;
            `;

            const { rows } = await pool.query(
                queryText,
                [projectId]
            );

            socket.emit(
                "chat_history",
                rows
            );

        } catch (error) {

            console.error(
                "Join Project Chat Error:",
                error.message
            );

            socket.emit("chat_error", {
                message:
                    "Unable to load project chat."
            });
        }
    });


    /*
    |--------------------------------------------------------------------------
    | LEAVE PROJECT CHAT
    |--------------------------------------------------------------------------
    */

    socket.on("leave_project_chat", ({ projectId }) => {

        if (!projectId) {
            return;
        }

        const roomName =
            `project_room_${projectId}`;

        socket.leave(roomName);

        console.log(
            `👋 User [${socket.user?.id}] left ${roomName}`
        );
    });


    /*
    |--------------------------------------------------------------------------
    | SEND MESSAGE
    |--------------------------------------------------------------------------
    */

    socket.on("send_message", async (messageData) => {

        const {
            projectId,
            message
        } = messageData || {};

        const senderId =
            Number(socket.user?.id);

        const senderName =
            socket.user?.name || "User";

        if (!projectId) {
            return;
        }

        if (!message?.trim()) {
            return;
        }

        if (!senderId) {
            return;
        }

        try {

            /*
            |--------------------------------------------------------------------------
            | Verify project access again
            |--------------------------------------------------------------------------
            */

            const projectCheck = await pool.query(
                `
                SELECT
                    id,
                    client_id,
                    developer_id
                FROM projects
                WHERE id = $1
                LIMIT 1;
                `,
                [projectId]
            );

            if (projectCheck.rows.length === 0) {

                socket.emit("chat_error", {
                    message: "Project not found."
                });

                return;
            }

            const project =
                projectCheck.rows[0];

            const isClient =
                Number(project.client_id) === senderId;

            const isDeveloper =
                project.developer_id &&
                Number(project.developer_id) === senderId;

            const isAdmin =
                socket.user?.role?.toLowerCase() === "admin";

            if (!isClient && !isDeveloper && !isAdmin) {

                socket.emit("chat_error", {
                    message:
                        "You are not authorized to send messages in this project."
                });

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | Save message
            |--------------------------------------------------------------------------
            */

            const cleanMessage =
                message.trim();

            const insertQuery = `
                INSERT INTO project_chats
                    (
                        project_id,
                        sender_id,
                        message
                    )
                VALUES
                    ($1, $2, $3)
                RETURNING
                    id,
                    created_at;
            `;

            const { rows } =
                await pool.query(
                    insertQuery,
                    [
                        projectId,
                        senderId,
                        cleanMessage
                    ]
                );

            /*
            |--------------------------------------------------------------------------
            | Message payload
            |--------------------------------------------------------------------------
            */

            const savedMessage = {
                id: rows[0].id,

                projectId: Number(projectId),

                senderId,

                senderName,

                message: cleanMessage,

                createdAt: rows[0].created_at
            };

            /*
            |--------------------------------------------------------------------------
            | Broadcast to everyone inside project room
            |--------------------------------------------------------------------------
            */

            io
                .to(`project_room_${projectId}`)
                .emit(
                    "receive_message",
                    savedMessage
                );

        } catch (error) {

            console.error(
                "Send Message Error:",
                error.message
            );

            socket.emit("chat_error", {
                message:
                    "Message could not be saved."
            });
        }
    });
};