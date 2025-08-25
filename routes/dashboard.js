import express from "express";
//import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/rolemiddleware.js";

const router = express.Router();

router.get("/admin", authenticateToken, authorizeRoles("admin"), (req, res) => {
  res.json({ message: "Welcome Admin Dashboard" });
});

//router.get("/faculty", authenticateToken, authorizeRoles("faculty"), (req, res) => {
//  res.json({ message: "Welcome Faculty Dashboard" });
//});

router.get("/student", authenticateToken, authorizeRoles("student"), (req, res) => {
  res.json({ message: "Welcome Student Dashboard" });
});

export default router;
