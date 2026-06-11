const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const templateController = require('../controllers/templateController');
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

// All authenticated users can view templates
router.get('/', templateController.getAllTemplates);
router.get('/:id', [
  param('id').isInt().withMessage('Valid template ID is required'),
  validate
], templateController.getTemplateById);

// Only managers and admins can create, update, delete, apply
router.post('/', [
  authorizeRole('manager', 'admin'),
  body('name').trim().notEmpty().withMessage('Template name is required'),
  body('start_time').matches(/^\d{2}:\d{2}:\d{2}$/).withMessage('Start time must be in HH:MM:SS format'),
  body('end_time').matches(/^\d{2}:\d{2}:\d{2}$/).withMessage('End time must be in HH:MM:SS format'),
  body('position').optional().trim(),
  body('color').optional().isHexColor().withMessage('Color must be a valid hex color'),
  validate
], templateController.createTemplate);
router.put('/:id', [
  authorizeRole('manager', 'admin'),
  param('id').isInt().withMessage('Valid template ID is required'),
  body('name').optional().trim().notEmpty().withMessage('Template name cannot be empty'),
  body('start_time').optional().matches(/^\d{2}:\d{2}:\d{2}$/).withMessage('Start time must be in HH:MM:SS format'),
  body('end_time').optional().matches(/^\d{2}:\d{2}:\d{2}$/).withMessage('End time must be in HH:MM:SS format'),
  body('color').optional().isHexColor().withMessage('Color must be a valid hex color'),
  validate
], templateController.updateTemplate);
router.delete('/:id', [
  authorizeRole('manager', 'admin'),
  param('id').isInt().withMessage('Valid template ID is required'),
  validate
], templateController.deleteTemplate);
router.post('/apply', [
  authorizeRole('manager', 'admin'),
  body('template_id').isInt().withMessage('Valid template ID is required'),
  body('employee_id').isInt().withMessage('Valid employee ID is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  validate
], templateController.applyTemplate);
router.post('/apply-week', [
  authorizeRole('manager', 'admin'),
  body('template_id').isInt().withMessage('Valid template ID is required'),
  body('employee_id').isInt().withMessage('Valid employee ID is required'),
  body('week_start_date').isISO8601().withMessage('Valid week start date is required'),
  validate
], templateController.applyTemplateToWeek);

module.exports = router;
