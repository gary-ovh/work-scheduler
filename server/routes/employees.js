const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const employeeController = require('../controllers/employeeController');
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

router.get('/', employeeController.getAllEmployees);
router.get('/me', employeeController.getCurrentEmployee);
router.get('/:id', [
  param('id').isInt().withMessage('Valid employee ID is required'),
  validate
], employeeController.getEmployeeById);
router.post('/', [
  authorizeRole('manager', 'admin'),
  body('first_name').trim().notEmpty().withMessage('First name is required'),
  body('last_name').trim().notEmpty().withMessage('Last name is required'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['employee', 'manager', 'admin']).withMessage('Invalid role'),
  body('team_id').optional().isInt().withMessage('Valid team ID is required'),
  validate
], employeeController.createEmployee);
router.put('/:id', [
  authorizeRole('manager', 'admin'),
  param('id').isInt().withMessage('Valid employee ID is required'),
  body('first_name').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('last_name').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('team_id').optional().isInt().withMessage('Valid team ID is required'),
  validate
], employeeController.updateEmployee);
router.put('/:id/role', [
  authorizeRole('admin'),
  param('id').isInt().withMessage('Valid employee ID is required'),
  body('role').isIn(['employee', 'manager', 'admin']).withMessage('Invalid role'),
  validate
], employeeController.updateEmployeeRole);
router.delete('/:id', [
  authorizeRole('admin'),
  param('id').isInt().withMessage('Valid employee ID is required'),
  validate
], employeeController.deleteEmployee);

module.exports = router;
