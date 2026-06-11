const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const teamController = require('../controllers/teamController');
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

router.get('/', teamController.getAllTeams);
router.get('/:id', [
  param('id').isInt().withMessage('Valid team ID is required'),
  validate
], teamController.getTeamById);
router.get('/:id/details', [
  param('id').isInt().withMessage('Valid team ID is required'),
  validate
], teamController.getTeamWithMembers);
router.get('/:id/shifts', [
  param('id').isInt().withMessage('Valid team ID is required'),
  query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  validate
], teamController.getTeamShifts);
router.post('/', [
  authorizeRole('manager', 'admin'),
  body('name').trim().notEmpty().withMessage('Team name is required'),
  body('description').optional().trim(),
  body('color').optional().isHexColor().withMessage('Color must be a valid hex color'),
  validate
], teamController.createTeam);
router.put('/:id', [
  authorizeRole('manager', 'admin'),
  param('id').isInt().withMessage('Valid team ID is required'),
  body('name').optional().trim().notEmpty().withMessage('Team name cannot be empty'),
  body('description').optional().trim(),
  body('color').optional().isHexColor().withMessage('Color must be a valid hex color'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  validate
], teamController.updateTeam);
router.delete('/:id', [
  authorizeRole('admin'),
  param('id').isInt().withMessage('Valid team ID is required'),
  validate
], teamController.deleteTeam);

module.exports = router;
