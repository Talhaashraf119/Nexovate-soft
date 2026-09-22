import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { registerChatHandlers } from "../sockets/chatSocket.js";

let io;

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: [
                "http://localhost:5173",
                "https://nexovate-soft.vercel.app"
            ],
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.use((socket, next) => {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.query?.token;

        if (!token) {
            console.log(
                "❌ Socket connection rejected: No token provided."
            );

            return next(
                new Error("Authentication error: Token missing.")
            );
        }

        try {
            const cleanToken = token.startsWith("Bearer ")
                ? token.slice(7)
                : token;

            const decoded = jwt.verify(
                cleanToken,
                process.env.JWT_SECRET
            );

            socket.user = decoded;

            next();

        } catch (error) {
            console.log(
                "❌ Socket connection rejected: Invalid or expired token."
            );

            return next(
                new Error(
                    "Authentication error: Invalid or expired token."
                )
            );
        }
    });

    io.on("connection", (socket) => {

        console.log(
            `🔌 Authenticated user connected: User ID [${socket.user?.id}] Socket: ${socket.id}`
        );

        registerChatHandlers(io, socket);

        socket.on("disconnect", (reason) => {
            console.log(
                `❌ User disconnected: ${socket.id} | Reason: ${reason}`
            );
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error(
            "Socket.io has not been initialized!"
        );
    }

    return io;
};