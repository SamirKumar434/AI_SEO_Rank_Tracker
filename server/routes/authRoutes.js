import express from "express";
import {getUser, login, register} from "../controller/authController.js";
import auth from "../middleware/auth.js";

const authRouter = express.Router();
authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/user', auth, getUser);

export default authRouter;