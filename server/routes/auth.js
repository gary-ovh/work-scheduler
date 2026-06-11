const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.put('/change-password', authenticateToken, authController.changePassword);
router.put('/reset-password', authenticateToken, authorizeRole('admin', 'manager'), authController.resetPassword);

module.exports = router;
