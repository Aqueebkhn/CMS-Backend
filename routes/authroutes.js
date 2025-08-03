import { registerUser, login } from "../controllers/authcontrollers";
import express from "express";


const router = express.Router();

router.post("/register", registerUser);
router.post("/login", login);

export  {router};