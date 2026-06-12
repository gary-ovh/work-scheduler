const pool = require('../config/database');

const getAllShifts = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT s.id, s.employee_id, 
        TO_CHAR(s.start_time, 'YYYY-MM-DD HH24:MI:SS') as start_time,
        TO_CHAR(s.end_time, 'YYYY-MM-DD HH24:MI:SS') as end_time,
        s.position, s.status, s.notes, s.created_at, s.updated_at,
        e.first_name, e.last_name, e.position as employee_position
      FROM shifts s
      JOIN employees e ON s.employee_id = e.id
    `;
    
    const values = [];
    const conditions = [];

    if (startDate) {
      conditions.push(`s.start_time >= $${values.length + 1}`);
      values.push(startDate);
    }
    
    if (endDate) {
      conditions.push(`s.end_time <= $${values.length + 1}`);
      values.push(endDate);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY s.start_time ASC';

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
};

const getShiftById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT s.*, e.first_name, e.last_name FROM shifts s JOIN employees e ON s.employee_id = e.id WHERE s.id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get shift error:', error);
    res.status(500).json({ error: 'Failed to fetch shift' });
  }
};

const createShift = async (req, res) => {
  try {
    const { employee_id, start_time, end_time, position, notes } = req.body;

    if (new Date(start_time) >= new Date(end_time)) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    // If times are in ISO format with Z, remove the Z to store as local time
    const startTime = start_time.endsWith('Z') ? start_time.replace('Z', '') : start_time;
    const endTime = end_time.endsWith('Z') ? end_time.replace('Z', '') : end_time;

    const result = await pool.query(
      'INSERT INTO shifts (employee_id, start_time, end_time, position, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [employee_id, startTime, endTime, position, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create shift error:', error);
    res.status(500).json({ error: 'Failed to create shift' });
  }
};

const updateShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_id, start_time, end_time, position, status, notes } = req.body;

    const result = await pool.query(
      'UPDATE shifts SET employee_id = COALESCE($1, employee_id), start_time = COALESCE($2, start_time), end_time = COALESCE($3, end_time), position = COALESCE($4, position), status = COALESCE($5, status), notes = COALESCE($6, notes), updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
      [employee_id, start_time, end_time, position, status, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json({ error: 'Failed to update shift' });
  }
};

const deleteShift = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM shifts WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    res.json({ message: 'Shift deleted successfully' });
  } catch (error) {
    console.error('Delete shift error:', error);
    res.status(500).json({ error: 'Failed to delete shift' });
  }
};

const getEmployeeShifts = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT * FROM shifts 
      WHERE employee_id = $1
    `;
    
    const values = [employeeId];
    
    if (startDate) {
      query += ` AND start_time >= $${values.length + 1}`;
      values.push(startDate);
    }
    
    if (endDate) {
      query += ` AND end_time <= $${values.length + 1}`;
      values.push(endDate);
    }

    query += ' ORDER BY start_time ASC';

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Get employee shifts error:', error);
    res.status(500).json({ error: 'Failed to fetch employee shifts' });
  }
};

module.exports = { getAllShifts, getShiftById, createShift, updateShift, deleteShift, getEmployeeShifts };
