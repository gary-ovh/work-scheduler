const pool = require('../config/database');

const getAllTeams = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM teams ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
};

const getTeamById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM teams WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
};

const getTeamWithMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const teamResult = await pool.query('SELECT * FROM teams WHERE id = $1', [id]);
    
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const membersResult = await pool.query(
      `SELECT e.*, u.email, u.role 
       FROM employees e 
       JOIN users u ON e.user_id = u.id 
       WHERE e.team_id = $1 
       ORDER BY e.last_name ASC`,
      [id]
    );
    
    res.json({
      ...teamResult.rows[0],
      members: membersResult.rows
    });
  } catch (error) {
    console.error('Get team with members error:', error);
    res.status(500).json({ error: 'Failed to fetch team details' });
  }
};

const createTeam = async (req, res) => {
  try {
    const { name, description, color } = req.body;
    
    const result = await pool.query(
      'INSERT INTO teams (name, description, color) VALUES ($1, $2, $3) RETURNING *',
      [name, description, color || '#007bff']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create team error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Team name already exists' });
    }
    res.status(500).json({ error: 'Failed to create team' });
  }
};

const updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, is_active } = req.body;
    
    const result = await pool.query(
      `UPDATE teams 
       SET name = COALESCE($1, name), 
           description = COALESCE($2, description), 
           color = COALESCE($3, color), 
           is_active = COALESCE($4, is_active),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5 
       RETURNING *`,
      [name, description, color, is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update team error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Team name already exists' });
    }
    res.status(500).json({ error: 'Failed to update team' });
  }
};

const deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM teams WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
};

const getTeamShifts = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    
    const result = await pool.query(
      `SELECT s.*, e.first_name, e.last_name, e.position
       FROM shifts s
       JOIN employees e ON s.employee_id = e.id
       WHERE e.team_id = $1
         AND s.start_time >= $2
         AND s.start_time <= $3
       ORDER BY s.start_time ASC`,
      [id, startDate, endDate]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get team shifts error:', error);
    res.status(500).json({ error: 'Failed to fetch team shifts' });
  }
};

module.exports = { 
  getAllTeams, 
  getTeamById, 
  getTeamWithMembers, 
  createTeam, 
  updateTeam, 
  deleteTeam,
  getTeamShifts
};
