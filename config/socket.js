import { Server } from "socket.io";
import jwt from "jsonwebtoken"; 
import { registerChatHandlers } from "../sockets/chatSocket.js";

let io;

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;

        if (!token) {
            console.log("❌ Socket Connection Rejected: No token provided.");
            return next(new Error("Authentication error: Token missing."));
        }

        try {
            const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;
            
            const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
            
            socket.user = decoded; 
            next();
        } catch (err) {
            console.log("❌ Socket Connection Rejected: Invalid token processing.");
            return next(new Error("Authentication error: Invalid or expired token."));
        }
    });

    io.on("connection", (socket) => {
        console.log(`🔌 Authenticated User Connected: User ID [${socket.user?.id}] -> Socket: ${socket.id}`);

        registerChatHandlers(io, socket);

        socket.on("disconnect", () => {
            console.log(`❌ User disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io has not been initialized!");
    }
    return io;
};
