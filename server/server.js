const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const shiftRoutes = require('./routes/shifts');
const employeeRoutes = require('./routes/employees');
const leaveRoutes = require('./routes/leave');
const templateRoutes = require('./routes/templates');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/templates', templateRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Work Scheduler API' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
