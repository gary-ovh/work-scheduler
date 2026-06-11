const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', employeeController.getAllEmployees);
router.get('/me', employeeController.getCurrentEmployee);
router.get('/:id', employeeController.getEmployeeById);
router.post('/', authorizeRole('manager', 'admin'), employeeController.createEmployee);
router.put('/:id', authorizeRole('manager', 'admin'), employeeController.updateEmployee);
router.put('/:id/role', authorizeRole('admin'), employeeController.updateEmployeeRole);
router.delete('/:id', authorizeRole('admin'), employeeController.deleteEmployee);

module.exports = router;
