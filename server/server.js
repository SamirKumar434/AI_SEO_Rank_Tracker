//step1:setting up server
//step2:creating user auth using(user.js) users name ,email ,pass and other details
import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import rankRouter from "./routes/rankRoutes.js"
import analysisRouter from"./routes/analysisRoutes.js"
import { startRankTrackingCron } from "../server/cron/rankTrackingCron.js";

connectDB();
const app=express()
app.use(cors());
app.use(express.json());
app.get('/',(req,res)=>res.send("Server running "));
app.use("/api/auth",authRouter);
app.use("/api/rank",rankRouter);
app.use("/api/analysis",analysisRouter)
//start cron jobs
startRankTrackingCron();
const PORT=process.env.PORT||5000;
app.listen(PORT,()=>console.log(`server running on port ${PORT}`));
