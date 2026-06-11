const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const leaveController = require('../controllers/leaveController');
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

router.get('/balance/:employeeId', [
  param('employeeId').isInt().withMessage('Valid employee ID is required'),
  validate
], leaveController.getLeaveBalance);
router.put('/balance/:employeeId', [
  authorizeRole('manager', 'admin'),
  param('employeeId').isInt().withMessage('Valid employee ID is required'),
  body('vacation_days').optional().isFloat({ min: 0 }).withMessage('Vacation days must be a positive number'),
  body('sick_days').optional().isFloat({ min: 0 }).withMessage('Sick days must be a positive number'),
  body('flexible_days').optional().isFloat({ min: 0 }).withMessage('Flexible days must be a positive number'),
  validate
], leaveController.updateLeaveBalance);

// Managers can see all requests, employees can filter by their own employee_id
router.get('/requests', [
  query('employee_id').optional().isInt().withMessage('Valid employee ID is required'),
  query('status').optional().isIn(['pending', 'approved', 'denied', 'cancelled']).withMessage('Invalid status'),
  validate
], leaveController.getAllTimeOffRequests);
router.get('/requests/my', leaveController.getAllTimeOffRequests);
router.get('/requests/:id', [
  param('id').isInt().withMessage('Valid request ID is required'),
  validate
], leaveController.getTimeOffRequestById);
router.post('/requests', [
  body('employee_id').isInt().withMessage('Valid employee ID is required'),
  body('start_date').isISO8601().withMessage('Valid start date is required'),
  body('end_date').isISO8601().withMessage('Valid end date is required'),
  body('leave_type').isIn(['vacation', 'sick', 'flexible']).withMessage('Invalid leave type'),
  body('hours_requested').optional().isFloat({ min: 0.5, max: 24 }).withMessage('Hours must be between 0.5 and 24'),
  body('reason').optional().trim(),
  validate
], leaveController.createTimeOffRequest);
router.put('/requests/:id/review', [
  authorizeRole('manager', 'admin'),
  param('id').isInt().withMessage('Valid request ID is required'),
  body('status').isIn(['approved', 'denied']).withMessage('Status must be approved or denied'),
  body('reviewed_by').optional().isInt().withMessage('Valid reviewer ID is required'),
  validate
], leaveController.reviewTimeOffRequest);
router.put('/requests/:id/cancel', [
  param('id').isInt().withMessage('Valid request ID is required'),
  validate
], leaveController.cancelTimeOffRequest);
router.delete('/requests/:id', [
  param('id').isInt().withMessage('Valid request ID is required'),
  validate
], leaveController.deleteTimeOffRequest);

module.exports = router;
