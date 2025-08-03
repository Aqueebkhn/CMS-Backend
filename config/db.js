import pg from "pg";
import dotenv from "dotenv";


dotenv.config();

const {pool} = new pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: "process.env.DB_PASSWORD",
    port: process.env.DB_PORT,
});

db.connect();

console.log("Connected to the database");

export {pool};