const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', shiftController.getAllShifts);
router.get('/employee/:employeeId', shiftController.getEmployeeShifts);
router.get('/:id', shiftController.getShiftById);
router.post('/', authorizeRole('manager', 'admin'), shiftController.createShift);
router.put('/:id', authorizeRole('manager', 'admin'), shiftController.updateShift);
router.delete('/:id', authorizeRole('manager', 'admin'), shiftController.deleteShift);

module.exports = router;
