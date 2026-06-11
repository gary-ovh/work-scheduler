const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', teamController.getAllTeams);
router.get('/:id', teamController.getTeamById);
router.get('/:id/details', teamController.getTeamWithMembers);
router.get('/:id/shifts', teamController.getTeamShifts);
router.post('/', authorizeRole('manager', 'admin'), teamController.createTeam);
router.put('/:id', authorizeRole('manager', 'admin'), teamController.updateTeam);
router.delete('/:id', authorizeRole('admin'), teamController.deleteTeam);

module.exports = router;
