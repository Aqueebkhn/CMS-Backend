# Attendance System Documentation

## Overview
A comprehensive attendance management system has been added to your existing Node.js/Express application. This system allows users to clock in/out and provides administrators with detailed reporting capabilities.

## Database Setup

### 1. Run the SQL Schema
Execute the SQL script to create the attendance table:

```bash
# Connect to your PostgreSQL database and run:
psql -U your_username -d your_database -f config/attendance_schema.sql
```

The schema includes:
- `attendance` table with proper relationships to users
- Indexes for optimal performance
- Triggers for automatic timestamp updates and hour calculations
- Constraints to prevent duplicate clock-ins

## API Endpoints

All attendance endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### User Endpoints

#### 1. Clock In
```http
POST /api/attendance/clock-in
Content-Type: application/json

{
  "notes": "Starting work on project X" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully clocked in!",
  "data": {
    "attendance": {
      "id": 1,
      "user_id": 1,
      "clock_in_time": "2024-01-15T09:00:00.000Z",
      "work_date": "2024-01-15",
      "status": "active",
      "notes": "Starting work on project X"
    },
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

#### 2. Clock Out
```http
POST /api/attendance/clock-out
Content-Type: application/json

{
  "notes": "Completed tasks for the day" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully clocked out!",
  "data": {
    "attendance": {
      "id": 1,
      "user_id": 1,
      "clock_in_time": "2024-01-15T09:00:00.000Z",
      "clock_out_time": "2024-01-15T17:30:00.000Z",
      "total_hours": 8.5,
      "status": "completed"
    },
    "totalHours": 8.5
  }
}
```

#### 3. Get Current Status
```http
GET /api/attendance/status
```

**Response:**
```json
{
  "success": true,
  "message": "Active attendance found",
  "data": {
    "isActive": true,
    "attendance": {
      "id": 1,
      "user_id": 1,
      "clock_in_time": "2024-01-15T09:00:00.000Z",
      "work_date": "2024-01-15",
      "status": "active"
    },
    "currentHoursWorked": 2.5
  }
}
```

#### 4. Get User Attendance History
```http
GET /api/attendance/my-attendance?startDate=2024-01-01&endDate=2024-01-31&page=1&limit=10
```

**Query Parameters:**
- `startDate` (optional): Filter from date (YYYY-MM-DD)
- `endDate` (optional): Filter to date (YYYY-MM-DD)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Records per page (default: 10)

### Admin Endpoints (Admin Role Required)

#### 5. Get All Users Attendance
```http
GET /api/attendance/all-users?startDate=2024-01-01&endDate=2024-01-31&userId=1&page=1&limit=20
```

**Query Parameters:**
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date
- `userId` (optional): Filter by specific user
- `page` (optional): Page number (default: 1)
- `limit` (optional): Records per page (default: 20)

#### 6. Generate Attendance Report
```http
GET /api/attendance/report?startDate=2024-01-01&endDate=2024-01-31&userId=1
```

**Required Query Parameters:**
- `startDate`: Report start date (YYYY-MM-DD)
- `endDate`: Report end date (YYYY-MM-DD)

**Optional Query Parameters:**
- `userId`: Generate report for specific user

**Response:**
```json
{
  "success": true,
  "message": "Attendance report generated successfully",
  "data": {
    "report": [
      {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "role": "employee",
        "total_days_worked": "20",
        "total_hours_worked": "160.00",
        "average_hours_per_day": "8.00",
        "incomplete_days": "0"
      }
    ],
    "statistics": {
      "totalUsers": 1,
      "totalHoursAllUsers": "160.00",
      "averageHoursPerUser": "160.00",
      "mostActiveUser": {
        "name": "John Doe",
        "total_hours_worked": "160.00"
      },
      "dateRange": {
        "startDate": "2024-01-01",
        "endDate": "2024-01-31"
      }
    }
  }
}
```

#### 7. Update Attendance Record
```http
PUT /api/attendance/update/:id
Content-Type: application/json

{
  "clock_in_time": "2024-01-15T09:00:00.000Z", // Optional
  "clock_out_time": "2024-01-15T17:30:00.000Z", // Optional
  "notes": "Updated notes", // Optional
  "status": "completed" // Optional: active, completed, cancelled
}
```

## Features

### User Features
1. **Clock In/Out**: Simple one-click attendance tracking
2. **Status Check**: View current attendance status and hours worked
3. **Personal History**: View personal attendance records with filtering
4. **Notes**: Add optional notes for clock-in and clock-out

### Admin Features
1. **All Users View**: Monitor all employees' attendance
2. **Comprehensive Reports**: Generate detailed attendance reports
3. **Statistics**: Get insights on total hours, averages, and most active users
4. **Record Management**: Update attendance records when needed
5. **Advanced Filtering**: Filter by date ranges, specific users

### System Features
1. **Duplicate Prevention**: Users can't clock in twice on the same day
2. **Automatic Calculations**: Total hours calculated automatically on clock-out
3. **Data Integrity**: Database constraints ensure data consistency
4. **Pagination**: All list endpoints support pagination
5. **Audit Trail**: Automatic timestamps for created_at and updated_at

## Database Schema

### Attendance Table
```sql
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    clock_out_time TIMESTAMP WITH TIME ZONE NULL,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_hours DECIMAL(5,2) NULL,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Key Constraints
- Unique constraint prevents multiple active clock-ins per user per day
- Foreign key relationship with users table
- Check constraint for valid status values

## Error Handling

The system includes comprehensive error handling:

1. **Authentication Errors**: 401 for invalid/missing tokens
2. **Authorization Errors**: 403 for insufficient permissions
3. **Validation Errors**: 400 for invalid data or business rule violations
4. **Not Found Errors**: 404 for non-existent resources
5. **Server Errors**: 500 for unexpected server issues

## Security Features

1. **JWT Authentication**: All endpoints protected with JWT tokens
2. **Role-Based Access**: Admin-only endpoints properly secured
3. **User Isolation**: Users can only see their own data (except admins)
4. **SQL Injection Protection**: Parameterized queries throughout
5. **Input Validation**: Proper validation on all inputs

## Usage Examples

### Basic Employee Workflow
```javascript
// 1. Clock in for the day
const clockInResponse = await fetch('/api/attendance/clock-in', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    notes: 'Starting work on new feature'
  })
});

// 2. Check current status
const statusResponse = await fetch('/api/attendance/status', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

// 3. Clock out at end of day
const clockOutResponse = await fetch('/api/attendance/clock-out', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    notes: 'Completed all assigned tasks'
  })
});
```

### Admin Report Generation
```javascript
// Generate monthly report for all users
const reportResponse = await fetch('/api/attendance/report?startDate=2024-01-01&endDate=2024-01-31', {
  headers: {
    'Authorization': 'Bearer ' + adminToken
  }
});
```

## Installation and Setup

1. **Install Dependencies**: Already included in your package.json
2. **Run Database Schema**: Execute `config/attendance_schema.sql`
3. **Server Configuration**: Attendance routes are already registered in server.js
4. **Environment Variables**: Use existing JWT configuration

The attendance system is now fully integrated and ready to use!