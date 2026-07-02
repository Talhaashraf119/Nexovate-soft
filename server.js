import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import developerRoutes from "./routes/developerRoutes.js";
import scopeRoutes from "./routes/scopeRoutes.js";
import wizardRoutes from "./routes/wizardRoutes.js";

dotenv.config({ quiet: true });

const app = express();

// Enable CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://nexovate-soft.vercel.app", // your frontend when deployed
    ],
    credentials: true,
  })
);

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/developers", developerRoutes);
app.use("/api/ai", scopeRoutes);
app.use("/api/ai", wizardRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});