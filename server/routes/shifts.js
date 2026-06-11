const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const shiftController = require('../controllers/shiftController');
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

// All authenticated users can view shifts
router.get('/', [
  query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  validate
], shiftController.getAllShifts);
router.get('/employee/:employeeId', [
  param('employeeId').isInt().withMessage('Valid employee ID is required'),
  validate
], shiftController.getEmployeeShifts);
router.get('/:id', [
  param('id').isInt().withMessage('Valid shift ID is required'),
  validate
], shiftController.getShiftById);

// Only managers and admins can create, update, delete
router.post('/', [
  authorizeRole('manager', 'admin'),
  body('employee_id').isInt().withMessage('Valid employee ID is required'),
  body('start_time').isISO8601().withMessage('Valid start time is required'),
  body('end_time').isISO8601().withMessage('Valid end time is required'),
  body('position').optional().trim(),
  body('notes').optional().trim(),
  validate
], shiftController.createShift);
router.put('/:id', [
  authorizeRole('manager', 'admin'),
  param('id').isInt().withMessage('Valid shift ID is required'),
  body('employee_id').optional().isInt().withMessage('Valid employee ID is required'),
  body('start_time').optional().isISO8601().withMessage('Valid start time is required'),
  body('end_time').optional().isISO8601().withMessage('Valid end time is required'),
  validate
], shiftController.updateShift);
router.delete('/:id', [
  authorizeRole('manager', 'admin'),
  param('id').isInt().withMessage('Valid shift ID is required'),
  validate
], shiftController.deleteShift);

module.exports = router;
