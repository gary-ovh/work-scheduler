const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/balance/:employeeId', leaveController.getLeaveBalance);
router.put('/balance/:employeeId', authorizeRole('manager', 'admin'), leaveController.updateLeaveBalance);

router.get('/requests', authorizeRole('manager', 'admin'), leaveController.getAllTimeOffRequests);
router.get('/requests/my', leaveController.getAllTimeOffRequests);
router.get('/requests/:id', leaveController.getTimeOffRequestById);
router.post('/requests', leaveController.createTimeOffRequest);
router.put('/requests/:id/review', authorizeRole('manager', 'admin'), leaveController.reviewTimeOffRequest);
router.delete('/requests/:id', authorizeRole('manager', 'admin'), leaveController.deleteTimeOffRequest);

module.exports = router;
