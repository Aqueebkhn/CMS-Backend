import express from 'express';
import {
  clockIn,
  clockOut,
  getCurrentStatus,
  getUserAttendance,
  getAllUsersAttendance,
  generateAttendanceReport,
  updateAttendanceRecord
} from '../controllers/attendancecontrollers.js';
import { verifyToken } from '../controllers/authcontrollers.js';

const router = express.Router();

// All attendance routes require authentication
router.use(verifyToken);

// User Attendance Routes
router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/status', getCurrentStatus);
router.get('/my-attendance', getUserAttendance);

// Admin Only Routes
router.get('/all-users', getAllUsersAttendance);
router.get('/report', generateAttendanceReport);
router.put('/update/:id', updateAttendanceRecord);

export default router;