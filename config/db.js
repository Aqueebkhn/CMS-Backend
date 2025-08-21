import pg from "pg";
import dotenv from "dotenv";


dotenv.config();

const pool = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const connectPool = async () => {
  // Test the database connection
  pool.connect((err, client, release) => {
    if (err) {
      console.error("Error acquiring client", err.stack);
      throw new Error("Database connection error");
    } else {
      console.log("Database connected successfully");
      release();
    }
  });
};

connectPool();

console.log("Connected to the database");

export default pool;