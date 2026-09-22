import express from "express";
import { createServer } from "http";
import dotenv from "dotenv";
import cors from "cors";

import authRoutes from "./routes/authRoutes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes/adminRoutes.js";
import projectRoutes from "./routes/clientRoutes/projectRoutes.js";
import clientRoutes from "./routes/clientRoutes/clientRoutes.js";
import developerRoutes from "./routes/developerRoutes/developerRoutes.js";
import scopeRoutes from "./routes/clientRoutes/scopeRoutes.js";
import escrowRoutes from "./routes/paymentRoutes/escrowRoutes.js";

import { initSocket } from "./config/socket.js";

dotenv.config();

const app = express();

app.use(
    cors({
        origin: function (origin, callback) {

            if (!origin) {
                return callback(null, true);
            }

            const allowedOrigins = [
                "http://localhost:5173",
                "https://nexovate-soft.vercel.app"
            ];

            if (
                allowedOrigins.includes(origin) ||
                /\.vercel\.app$/.test(origin)
            ) {
                callback(null, true);
            } else {
                callback(
                    new Error("Not allowed by CORS")
                );
            }
        },

        credentials: true
    })
);

app.use(express.json());

app.use("/admin", adminRoutes);
app.use("/payment", escrowRoutes);
app.use("/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/developers", developerRoutes);
app.use("/api/ai", scopeRoutes);

const httpServer =
    createServer(app);

initSocket(httpServer);

const PORT =
    process.env.PORT || 5000;

httpServer.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `🚀 Server running on port ${PORT} with Socket.IO`
        );
    }
);