const bcrypt = require('bcrypt');
const pool = require('../config/database');

const getAllEmployees = async (req, res) => {
  try {
    const result = await pool.query('SELECT e.*, u.email, u.role FROM employees e JOIN users u ON e.user_id = u.id ORDER BY e.last_name ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT e.*, u.email, u.role FROM employees e JOIN users u ON e.user_id = u.id WHERE e.id = $1', [id]);
    
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
    const { user_id, first_name, last_name, phone, position, email, password, role } = req.body;

    let userId = user_id;

    // If email and password provided, create a new user
    if (email && password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const userResult = await pool.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id',
        [email, hashedPassword, role || 'employee']
      );
      userId = userResult.rows[0].id;
    }

    if (!userId) {
      return res.status(400).json({ error: 'Either user_id or email/password is required' });
    }

    const result = await pool.query(
      'INSERT INTO employees (user_id, first_name, last_name, phone, position) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, first_name, last_name, phone, position]
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
    const { first_name, last_name, phone, position } = req.body;

    const result = await pool.query(
      'UPDATE employees SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), phone = COALESCE($3, phone), position = COALESCE($4, position), updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [first_name, last_name, phone, position, id]
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

const updateEmployeeRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['employee', 'manager', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Get user_id from employee
    const empResult = await pool.query('SELECT user_id FROM employees WHERE id = $1', [id]);
    
    if (empResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const userId = empResult.rows[0].user_id;

    // Update user role
    const userResult = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, role',
      [role, userId]
    );

    res.json({ message: 'Role updated successfully', user: userResult.rows[0] });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Get employee details including user role
    const empResult = await pool.query(
      'SELECT e.*, u.role FROM employees e JOIN users u ON e.user_id = u.id WHERE e.id = $1',
      [id]
    );

    if (empResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employee = empResult.rows[0];

    // Prevent deleting admin users
    if (employee.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete admin users' });
    }

    const result = await pool.query('DELETE FROM employees WHERE id = $1 RETURNING *', [id]);

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};

module.exports = { getAllEmployees, getEmployeeById, createEmployee, updateEmployee, updateEmployeeRole, deleteEmployee };
