import pool from "./../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";




const registerUser = async (req ,res) => {
    const { name, email, password, role } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  await pool.query(
    'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
    [name, email, hashed, role]
  );
  res.json({ message: 'User registered' });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = userRes.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);
  res.json({ token });
};


export { registerUser, login };
