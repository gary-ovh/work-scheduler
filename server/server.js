const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const shiftRoutes = require('./routes/shifts');
const employeeRoutes = require('./routes/employees');
const leaveRoutes = require('./routes/leave');
const templateRoutes = require('./routes/templates');
const teamRoutes = require('./routes/teams');

const app = express();
const PORT = process.env.PORT || 5000;

// Security: Set security headers
app.use(helmet());

// Security: Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per 15 minutes
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/teams', teamRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Work Scheduler API' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
