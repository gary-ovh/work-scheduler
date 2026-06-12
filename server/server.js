const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const killPort = require('./kill-port-5000');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const shiftRoutes = require('./routes/shifts');
const employeeRoutes = require('./routes/employees');
const leaveRoutes = require('./routes/leave');
const templateRoutes = require('./routes/templates');
const teamRoutes = require('./routes/teams');
const timeClockRoutes = require('./routes/timeClock');

const app = express();
const PORT = process.env.PORT || 5000;

// Kill any existing process on port 5000 before starting
killPort().then(() => {
  startServer();
}).catch((err) => {
  console.error('Error killing port:', err);
  startServer();
});

function startServer() {

// CORS must be first, before helmet and rate limiter
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Security: Set security headers with CSP configured for development
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "http://localhost:3000", "http://localhost:5173"],
      styleSrc: ["'self'", "'unsafe-inline'", "http://localhost:3000", "http://localhost:5173"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "http://localhost:3000", "http://localhost:5173", "ws://localhost:3000", "ws://localhost:5173"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for Vite HMR
}));

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/time-clock', timeClockRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Work Scheduler API' });
});

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
