# Work Scheduler

A web application for scheduling work schedules with shift management and employee tracking.

## Tech Stack

- **Frontend**: React 18 + Vite + React Router
- **Backend**: Node.js + Express
- **Database**: PostgreSQL

## Features

- Shift management (create, edit, delete shifts)
- Shift templates for reusable shift configurations
- Employee management
- Time off requests with leave banks (Vacation, Sick, Flexible days)
- Dashboard with overview statistics
- Authentication with JWT
- Role-based access control

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)

## Installation

### 1. Clone and Setup

```bash
cd work-scheduler
```

### 2. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE work_scheduler;
```

Run the database schema:

```bash
psql -d work_scheduler -f server/models/database.sql
```

### 3. Backend Setup

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env` file with your database credentials:

```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=work_scheduler
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_here
```

### 4. Frontend Setup

```bash
cd ../client
npm install
```

### 5. Install Root Dependencies

```bash
cd ..
npm install
```

## Running the Application

### Development Mode

From the root directory:

```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend dev server on http://localhost:3000

### Separate Servers

Backend:
```bash
cd server
npm run dev
```

Frontend:
```bash
cd client
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Shifts
- `GET /api/shifts` - Get all shifts
- `GET /api/shifts/:id` - Get shift by ID
- `GET /api/shifts/employee/:employeeId` - Get employee shifts
- `POST /api/shifts` - Create shift (manager/admin only)
- `PUT /api/shifts/:id` - Update shift (manager/admin only)
- `DELETE /api/shifts/:id` - Delete shift (manager/admin only)

### Templates
- `GET /api/templates` - Get all shift templates
- `GET /api/templates/:id` - Get template by ID
- `POST /api/templates` - Create template (manager/admin only)
- `PUT /api/templates/:id` - Update template (manager/admin only)
- `DELETE /api/templates/:id` - Delete template (manager/admin only)
- `POST /api/templates/apply` - Apply template to create a shift (manager/admin only)
- `POST /api/templates/apply-week` - Apply template to create week of shifts (manager/admin only)

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Create employee (manager/admin only)
- `PUT /api/employees/:id` - Update employee (manager/admin only)
- `DELETE /api/employees/:id` - Delete employee (admin only)

### Leave Management
- `GET /api/leave/balance/:employeeId` - Get employee leave balance
- `PUT /api/leave/balance/:employeeId` - Update leave balance (manager/admin only)
- `GET /api/leave/requests` - Get all time off requests (manager/admin only)
- `GET /api/leave/requests/my` - Get my time off requests
- `GET /api/leave/requests/:id` - Get specific request
- `POST /api/leave/requests` - Create time off request
- `PUT /api/leave/requests/:id/review` - Review request (manager/admin only)
- `DELETE /api/leave/requests/:id` - Delete request (manager/admin only)

## Default User Roles

- `admin` - Full access to all features
- `manager` - Can manage shifts, employees, and time off requests
- `employee` - View-only access, can request time off

## Sample Users (After Database Setup)

**Admin:**
- Email: `admin@example.com`
- Password: `admin123`

**Employee:**
- Email: `employee@example.com`
- Password: `employee123`
- Leave Balance: 10 vacation days, 5 sick days, 3 flexible days

## Project Structure

```
work-scheduler/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── api.js         # API client
│   │   ├── App.jsx        # Main app component
│   │   └── main.jsx       # Entry point
│   └── package.json
├── server/                 # Express backend
│   ├── config/            # Database configuration
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Auth middleware
│   ├── models/            # Database schema
│   ├── routes/            # API routes
│   └── package.json
└── package.json           # Root package.json
```

## License

MIT
