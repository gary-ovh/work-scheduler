const pool = require('../config/database');

const getAllEmployees = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY last_name ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
};

const createEmployee = async (req, res) => {
  try {
    const { user_id, first_name, last_name, phone, position, hourly_rate } = req.body;

    const result = await pool.query(
      'INSERT INTO employees (user_id, first_name, last_name, phone, position, hourly_rate) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [user_id, first_name, last_name, phone, position, hourly_rate]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, phone, position, hourly_rate } = req.body;

    const result = await pool.query(
      'UPDATE employees SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), phone = COALESCE($3, phone), position = COALESCE($4, position), hourly_rate = COALESCE($5, hourly_rate), updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [first_name, last_name, phone, position, hourly_rate, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM employees WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};

module.exports = { getAllEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee };
