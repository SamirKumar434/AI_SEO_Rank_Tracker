//step1:setting up server
//step2:creating user auth using(user.js) users name ,email ,pass and other details
import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import rankRouter from "./routes/rankRoutes.js";
import analysisRouter from "./routes/analysisRoutes.js";
import { startRankTrackingCron } from "../server/cron/rankTrackingCron.js";

connectDB();
const app = express();

// CORS Configuration - FIX THIS
const allowedOrigins = [
  "https://ai-seo-rank-tracker-hu2y2rbty-samir-kumar-sahus-projects.vercel.app",
  "https://ai-seo-rank-tracker.vercel.app", // Your main domain
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log("Blocked origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

// Handle preflight requests
app.options("*", cors());

app.use(express.json());

// Simple health check endpoint
app.get("/", (req, res) => res.send("Server running "));
app.get("/api/health", (req, res) =>
  res.json({ status: "OK", message: "Server is healthy" }),
);

// Routes
app.use("/api/auth", authRouter);
app.use("/api/rank", rankRouter);
app.use("/api/analysis", analysisRouter);

// Start cron jobs
startRankTrackingCron();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`server running on port ${PORT}`));
