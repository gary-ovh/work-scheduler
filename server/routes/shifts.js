const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken);

// All authenticated users can view shifts
router.get('/', shiftController.getAllShifts);
router.get('/employee/:employeeId', shiftController.getEmployeeShifts);
router.get('/:id', shiftController.getShiftById);

// Only managers and admins can create, update, delete
router.post('/', authorizeRole('manager', 'admin'), shiftController.createShift);
router.put('/:id', authorizeRole('manager', 'admin'), shiftController.updateShift);
router.delete('/:id', authorizeRole('manager', 'admin'), shiftController.deleteShift);

module.exports = router;
