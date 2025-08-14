import express from 'express';
import {
  registerUser,
  login,
  verifyToken,
  generateToken,
  updateUserdetails,
  getAllUsers
} from '../controllers/authcontrollers.js'; // Add .js if using ES modules

const router = express.Router();

// Auth Routes
router.post('/register', registerUser);
router.post('/login', login);
router.post('/verify', verifyToken);
router.post('/generate-token', generateToken);
router.post('/update', verifyToken, updateUserdetails);
router.get('/usersdetails', verifyToken, getAllUsers);

export default router;
