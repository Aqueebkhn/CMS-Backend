import pool from '../config/db.js';

// Clock In - Start attendance for the day
const clockIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notes } = req.body;
    const workDate = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format

    // Check if user already has an active clock-in for today
    const existingAttendance = await pool.query(
      'SELECT * FROM attendance WHERE user_id = $1 AND work_date = $2 AND status = $3',
      [userId, workDate, 'active']
    );

    if (existingAttendance.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already clocked in today. Please clock out first.',
        data: existingAttendance.rows[0]
      });
    }

    // Create new attendance record
    const newAttendance = await pool.query(
      `INSERT INTO attendance (user_id, work_date, notes, status) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [userId, workDate, notes || null, 'active']
    );

    // Get user details for response
    const userDetails = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [userId]
    );

    res.status(201).json({
      success: true,
      message: 'Successfully clocked in!',
      data: {
        attendance: newAttendance.rows[0],
        user: userDetails.rows[0]
      }
    });

  } catch (error) {
    console.error('Clock In Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during clock in',
      error: error.message
    });
  }
};

// Clock Out - End attendance for the day
const clockOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notes } = req.body;
    const workDate = new Date().toISOString().split('T')[0];

    // Find active attendance record for today
    const activeAttendance = await pool.query(
      'SELECT * FROM attendance WHERE user_id = $1 AND work_date = $2 AND status = $3',
      [userId, workDate, 'active']
    );

    if (activeAttendance.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active clock-in found for today. Please clock in first.'
      });
    }

    const attendanceRecord = activeAttendance.rows[0];
    const clockOutTime = new Date();

    // Update attendance record with clock out time
    const updatedAttendance = await pool.query(
      `UPDATE attendance 
       SET clock_out_time = $1, 
           notes = COALESCE($2, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 
       RETURNING *`,
      [clockOutTime, notes || null, attendanceRecord.id]
    );

    // Calculate total hours manually for response
    const clockInTime = new Date(attendanceRecord.clock_in_time);
    const totalHours = (clockOutTime - clockInTime) / (1000 * 60 * 60); // Convert milliseconds to hours

    res.status(200).json({
      success: true,
      message: 'Successfully clocked out!',
      data: {
        attendance: updatedAttendance.rows[0],
        totalHours: Math.round(totalHours * 100) / 100 // Round to 2 decimal places
      }
    });

  } catch (error) {
    console.error('Clock Out Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during clock out',
      error: error.message
    });
  }
};

// Get Current Status - Check if user is currently clocked in
const getCurrentStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const workDate = new Date().toISOString().split('T')[0];

    const currentAttendance = await pool.query(
      `SELECT a.*, u.name, u.email 
       FROM attendance a 
       JOIN users u ON a.user_id = u.id 
       WHERE a.user_id = $1 AND a.work_date = $2 AND a.status = $3`,
      [userId, workDate, 'active']
    );

    if (currentAttendance.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No active attendance for today',
        data: {
          isActive: false,
          attendance: null
        }
      });
    }

    const attendance = currentAttendance.rows[0];
    const clockInTime = new Date(attendance.clock_in_time);
    const currentTime = new Date();
    const hoursWorked = (currentTime - clockInTime) / (1000 * 60 * 60);

    res.status(200).json({
      success: true,
      message: 'Active attendance found',
      data: {
        isActive: true,
        attendance: attendance,
        currentHoursWorked: Math.round(hoursWorked * 100) / 100
      }
    });

  } catch (error) {
    console.error('Get Current Status Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching current status',
      error: error.message
    });
  }
};

// Get User Attendance History
const getUserAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    
    const offset = (page - 1) * limit;
    let query = `
      SELECT a.*, u.name, u.email 
      FROM attendance a 
      JOIN users u ON a.user_id = u.id 
      WHERE a.user_id = $1
    `;
    let params = [userId];
    let paramCount = 1;

    // Add date filters if provided
    if (startDate) {
      paramCount++;
      query += ` AND a.work_date >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND a.work_date <= $${paramCount}`;
      params.push(endDate);
    }

    query += ` ORDER BY a.work_date DESC, a.clock_in_time DESC`;
    
    // Add pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const attendanceRecords = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) 
      FROM attendance 
      WHERE user_id = $1
    `;
    let countParams = [userId];
    let countParamCount = 1;

    if (startDate) {
      countParamCount++;
      countQuery += ` AND work_date >= $${countParamCount}`;
      countParams.push(startDate);
    }

    if (endDate) {
      countParamCount++;
      countQuery += ` AND work_date <= $${countParamCount}`;
      countParams.push(endDate);
    }

    const totalCount = await pool.query(countQuery, countParams);

    res.status(200).json({
      success: true,
      message: 'Attendance history retrieved successfully',
      data: {
        attendance: attendanceRecords.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount.rows[0].count / limit),
          totalRecords: parseInt(totalCount.rows[0].count),
          recordsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get User Attendance Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendance history',
      error: error.message
    });
  }
};

// Get All Users Attendance (Admin only)
const getAllUsersAttendance = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin access required'
      });
    }

    const { startDate, endDate, userId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT a.*, u.name, u.email, u.role
      FROM attendance a 
      JOIN users u ON a.user_id = u.id 
      WHERE 1=1
    `;
    let params = [];
    let paramCount = 0;

    // Add filters
    if (startDate) {
      paramCount++;
      query += ` AND a.work_date >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND a.work_date <= $${paramCount}`;
      params.push(endDate);
    }

    if (userId) {
      paramCount++;
      query += ` AND a.user_id = $${paramCount}`;
      params.push(userId);
    }

    query += ` ORDER BY a.work_date DESC, u.name ASC, a.clock_in_time DESC`;
    
    // Add pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const attendanceRecords = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) 
      FROM attendance a 
      JOIN users u ON a.user_id = u.id 
      WHERE 1=1
    `;
    let countParams = [];
    let countParamCount = 0;

    if (startDate) {
      countParamCount++;
      countQuery += ` AND a.work_date >= $${countParamCount}`;
      countParams.push(startDate);
    }

    if (endDate) {
      countParamCount++;
      countQuery += ` AND a.work_date <= $${countParamCount}`;
      countParams.push(endDate);
    }

    if (userId) {
      countParamCount++;
      countQuery += ` AND a.user_id = $${countParamCount}`;
      countParams.push(userId);
    }

    const totalCount = await pool.query(countQuery, countParams);

    res.status(200).json({
      success: true,
      message: 'All users attendance retrieved successfully',
      data: {
        attendance: attendanceRecords.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount.rows[0].count / limit),
          totalRecords: parseInt(totalCount.rows[0].count),
          recordsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get All Users Attendance Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching all users attendance',
      error: error.message
    });
  }
};

// Generate Attendance Report (Admin only)
const generateAttendanceReport = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin access required'
      });
    }

    const { startDate, endDate, userId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required for report generation'
      });
    }

    let query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        COUNT(a.id) as total_days_worked,
        COALESCE(SUM(a.total_hours), 0) as total_hours_worked,
        COALESCE(AVG(a.total_hours), 0) as average_hours_per_day,
        COUNT(CASE WHEN a.status = 'active' THEN 1 END) as incomplete_days
      FROM users u
      LEFT JOIN attendance a ON u.id = a.user_id 
        AND a.work_date >= $1 
        AND a.work_date <= $2
    `;
    let params = [startDate, endDate];

    if (userId) {
      query += ` AND u.id = $3`;
      params.push(userId);
    }

    query += ` GROUP BY u.id, u.name, u.email, u.role ORDER BY u.name`;

    const reportData = await pool.query(query, params);

    // Calculate additional statistics
    const stats = {
      totalUsers: reportData.rows.length,
      totalHoursAllUsers: reportData.rows.reduce((sum, user) => sum + parseFloat(user.total_hours_worked), 0),
      averageHoursPerUser: 0,
      mostActiveUser: null,
      dateRange: { startDate, endDate }
    };

    if (stats.totalUsers > 0) {
      stats.averageHoursPerUser = stats.totalHoursAllUsers / stats.totalUsers;
      stats.mostActiveUser = reportData.rows.reduce((max, user) => 
        parseFloat(user.total_hours_worked) > parseFloat(max.total_hours_worked) ? user : max
      );
    }

    res.status(200).json({
      success: true,
      message: 'Attendance report generated successfully',
      data: {
        report: reportData.rows.map(row => ({
          ...row,
          total_hours_worked: parseFloat(row.total_hours_worked).toFixed(2),
          average_hours_per_day: parseFloat(row.average_hours_per_day).toFixed(2)
        })),
        statistics: {
          ...stats,
          totalHoursAllUsers: stats.totalHoursAllUsers.toFixed(2),
          averageHoursPerUser: stats.averageHoursPerUser.toFixed(2)
        }
      }
    });

  } catch (error) {
    console.error('Generate Attendance Report Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while generating attendance report',
      error: error.message
    });
  }
};

// Update Attendance Record (Admin only)
const updateAttendanceRecord = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin access required'
      });
    }

    const { id } = req.params;
    const { clock_in_time, clock_out_time, notes, status } = req.body;

    // Check if attendance record exists
    const existingRecord = await pool.query(
      'SELECT * FROM attendance WHERE id = $1',
      [id]
    );

    if (existingRecord.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Update attendance record
    const updatedRecord = await pool.query(
      `UPDATE attendance 
       SET clock_in_time = COALESCE($1, clock_in_time),
           clock_out_time = COALESCE($2, clock_out_time),
           notes = COALESCE($3, notes),
           status = COALESCE($4, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 
       RETURNING *`,
      [clock_in_time || null, clock_out_time || null, notes || null, status || null, id]
    );

    res.status(200).json({
      success: true,
      message: 'Attendance record updated successfully',
      data: updatedRecord.rows[0]
    });

  } catch (error) {
    console.error('Update Attendance Record Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while updating attendance record',
      error: error.message
    });
  }
};

export {
  clockIn,
  clockOut,
  getCurrentStatus,
  getUserAttendance,
  getAllUsersAttendance,
  generateAttendanceReport,
  updateAttendanceRecord
};