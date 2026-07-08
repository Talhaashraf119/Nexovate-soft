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
// Enable CORS for localhost, main production, and all Vercel previews/deployments
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);

      const allowedPatterns = [
        /^http:\/\/localhost:\d+$/, // Matches localhost on any port
        /^https:\/\/nexovate-soft\.vercel\.app$/, // Your main domain
        /\.vercel\.app$/, // Matches ANY Vercel deployment/preview URL
      ];

      const isAllowed = allowedPatterns.some((pattern) => pattern.test(origin));

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
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