const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const timeClockController = require('../controllers/timeClockController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.use(authenticateToken);

// Team status endpoint - MUST be before /status/:employeeId to avoid matching "team" as employeeId
router.get('/status/team', timeClockController.getTeamStatus);
router.get('/team-status', timeClockController.getTeamStatus);

// Get employees who are late but not clocked in
router.get('/late', timeClockController.getLateEmployees);

// Status endpoints
router.get('/status/:employeeId?', [
  param('employeeId').optional().isInt().withMessage('Valid employee ID is required'),
  validate
], timeClockController.getCurrentStatus);

// Clock in/out endpoints
router.post('/clock-in', [
  body('employee_id').optional().isInt().withMessage('Valid employee ID is required'),
  body('notes').optional().trim(),
  validate
], timeClockController.clockIn);

router.post('/clock-out', [
  body('employee_id').optional().isInt().withMessage('Valid employee ID is required'),
  validate
], timeClockController.clockOut);

router.post('/break/start', [
  body('employee_id').optional().isInt().withMessage('Valid employee ID is required'),
  validate
], timeClockController.startBreak);

router.post('/break/end', [
  body('employee_id').optional().isInt().withMessage('Valid employee ID is required'),
  validate
], timeClockController.endBreak);

// Status endpoints
router.get('/status/:employeeId?', [
  param('employeeId').optional().isInt().withMessage('Valid employee ID is required'),
  validate
], timeClockController.getCurrentStatus);

// History endpoint
router.get('/history/:employeeId?', [
  param('employeeId').optional().isInt().withMessage('Valid employee ID is required'),
  query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  validate
], timeClockController.getTimeHistory);

module.exports = router;
