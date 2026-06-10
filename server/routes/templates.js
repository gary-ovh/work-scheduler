const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', templateController.getAllTemplates);
router.get('/:id', templateController.getTemplateById);
router.post('/', authorizeRole('manager', 'admin'), templateController.createTemplate);
router.put('/:id', authorizeRole('manager', 'admin'), templateController.updateTemplate);
router.delete('/:id', authorizeRole('manager', 'admin'), templateController.deleteTemplate);
router.post('/apply', authorizeRole('manager', 'admin'), templateController.applyTemplate);
router.post('/apply-week', authorizeRole('manager', 'admin'), templateController.applyTemplateToWeek);

module.exports = router;
