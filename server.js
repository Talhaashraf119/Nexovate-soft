import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import authRoutes from "./routes/authRoutes/authRoutes.js";
import projectRoutes from "./routes/clientRoutes/projectRoutes.js";
import developerRoutes from "./routes/developerRoutes/developerRoutes.js";
import scopeRoutes from "./routes/clientRoutes/scopeRoutes.js";
import wizardRoutes from "./routes/clientRoutes/wizardRoutes.js";
import clientRoutes from "./routes/clientRoutes/clientRoutes.js";

dotenv.config({ quiet: true });

const app = express();

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      const allowedPatterns = [
        /^http:\/\/localhost:\d+$/, 
        /^https:\/\/nexovate-soft\.vercel\.app$/, 
        /\.vercel\.app$/, 
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
app.use("/api/client", clientRoutes);
app.use("/api/developers", developerRoutes);
app.use("/api/ai", scopeRoutes);
app.use("/api/ai", wizardRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});