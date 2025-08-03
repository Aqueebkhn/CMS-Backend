import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import router from './routes/authroutes.js'; // ensure this file exists

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", router); // router alias matches import

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
