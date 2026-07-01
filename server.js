import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import developerRoutes from './routes/developerRoutes.js';
import cors from 'cors'

dotenv.config({ quiet:true});


const app = express();
app.use(cors({
    origin: [
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://localhost:5173",
        "https://nexovate-16g9yxcit-yusraakhaan204-5178s-projects.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));
app.use(express.json());


app.use('/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/developers', developerRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
