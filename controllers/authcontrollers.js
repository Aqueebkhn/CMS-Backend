import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1h';

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );
};

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  try {
    const token =
      req.body.token ||
      req.query.token ||
      req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: 'Unauthorized: No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: 'Unauthorized: Invalid token' });
  }
};

// Register User
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
      [name, email, hashedPassword, role]
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Register Error:', error.message);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Login User
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);
    const user = userRes.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.status(200).json({
      token,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Update User Details
const updateUserdetails = async (req, res) => {
  try {
    const { id } = req.params; // user id from URL
    const { name, email, password, role } = req.body;

    // Only allow update if user is admin or updating their own profile
    if (req.user.id !== parseInt(id) && req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ message: 'Forbidden: You can only update your own account' });
    }

    // Check if user exists
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [
      id,
    ]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Update query with COALESCE (only update provided fields)
    const updatedUser = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           password = COALESCE($3, password),
           role = COALESCE($4, role)
       WHERE id = $5
       RETURNING id, name, email, role`,
      [name || null, email || null, hashedPassword || null, role || null, id]
    );

    res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser.rows[0],
    });
  } catch (error) {
    console.error('Update User Error:', error.message);
    res.status(500).json({ message: 'Server error during update' });
  }
};

const getAllUsers = async (req, res) => {
  try{
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admins only' });
    }
    const users = await pool.query('SELECT id, name, email, role FROM users');
    res.status(200).json(users.rows);
  } catch (error) {
    console.error('Get All Users Error:', error.message);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
}

export { registerUser, login, generateToken, verifyToken, updateUserdetails, getAllUsers };
