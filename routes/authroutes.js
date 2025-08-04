import express from 'express';
import {
  registerUser,
  login,
  verifyToken,
  generateToken
} from '../controllers/authcontrollers.js'; // Add .js if using ES modules

const router = express.Router();

// Auth Routes
router.post('/register', registerUser);
router.post('/login', login);
router.post('/verify', verifyToken);
router.post('/generate-token', generateToken);

export default router;
