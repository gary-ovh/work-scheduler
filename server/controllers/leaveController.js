const pool = require('../config/database');

const getLeaveBalance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const currentYear = new Date().getFullYear();

    let result = await pool.query(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND year = $2',
      [employeeId, currentYear]
    );

    if (result.rows.length === 0) {
      const newBalance = await pool.query(
        `INSERT INTO leave_balances (employee_id, vacation_days, sick_days, flexible_days, year) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [employeeId, 0, 0, 0, currentYear]
      );
      result = newBalance;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({ error: 'Failed to fetch leave balance' });
  }
};

const updateLeaveBalance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { vacation_days, sick_days, flexible_days } = req.body;
    const currentYear = new Date().getFullYear();

    const result = await pool.query(
      `UPDATE leave_balances 
       SET vacation_days = COALESCE($1, vacation_days), 
           sick_days = COALESCE($2, sick_days), 
           flexible_days = COALESCE($3, flexible_days),
           updated_at = CURRENT_TIMESTAMP
       WHERE employee_id = $4 AND year = $5
       RETURNING *`,
      [vacation_days, sick_days, flexible_days, employeeId, currentYear]
    );

    if (result.rows.length === 0) {
      const newBalance = await pool.query(
        `INSERT INTO leave_balances (employee_id, vacation_days, sick_days, flexible_days, year) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [employeeId, vacation_days || 0, sick_days || 0, flexible_days || 0, currentYear]
      );
      return res.json(newBalance.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update leave balance error:', error);
    res.status(500).json({ error: 'Failed to update leave balance' });
  }
};

const createTimeOffRequest = async (req, res) => {
  try {
    const { employee_id, start_date, end_date, leave_type, reason } = req.body;

    console.log('Creating time off request:', { employee_id, start_date, end_date, leave_type, reason });

    if (!employee_id || !start_date || !end_date || !leave_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (startDate > endDate) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const daysRequested = (endDate - startDate) / (1000 * 60 * 60 * 24) + 1;
    const currentYear = startDate.getFullYear();

    console.log('Days requested:', daysRequested, 'Current year:', currentYear);

    const balanceResult = await pool.query(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND year = $2',
      [employee_id, currentYear]
    );

    console.log('Balance result:', balanceResult.rows);

    if (balanceResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'No leave balance found for this employee. Please contact HR to set up your leave balance.' 
      });
    }

    const balance = balanceResult.rows[0];
    let availableDays = 0;

    switch (leave_type.toLowerCase()) {
      case 'vacation':
        availableDays = parseFloat(balance.vacation_days);
        break;
      case 'sick':
        availableDays = parseFloat(balance.sick_days);
        break;
      case 'flexible':
        availableDays = parseFloat(balance.flexible_days);
        break;
      default:
        return res.status(400).json({ error: 'Invalid leave type' });
    }

    console.log(`Available ${leave_type} days:`, availableDays);

    if (daysRequested > availableDays) {
      return res.status(400).json({ 
        error: `Insufficient ${leave_type.toLowerCase()} days balance. Available: ${availableDays}, Requested: ${daysRequested}` 
      });
    }

    const result = await pool.query(
      `INSERT INTO time_off_requests 
       (employee_id, start_date, end_date, leave_type, days_requested, reason) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [employee_id, start_date, end_date, leave_type, daysRequested, reason]
    );

    console.log('Request created:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create time off request error:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to create time off request: ' + error.message });
  }
};

const getAllTimeOffRequests = async (req, res) => {
  try {
    const { status, employee_id } = req.query;
    const user = req.user;

    let query = `
      SELECT t.*, e.first_name, e.last_name 
      FROM time_off_requests t
      JOIN employees e ON t.employee_id = e.id
    `;

    const values = [];
    const conditions = [];

    // If not admin/manager, only show their own requests
    if (user.role !== 'admin' && user.role !== 'manager') {
      // Find the employee_id for this user
      const empResult = await pool.query(
        'SELECT id FROM employees WHERE user_id = $1',
        [user.id]
      );
      
      if (empResult.rows.length > 0) {
        conditions.push(`t.employee_id = $${values.length + 1}`);
        values.push(empResult.rows[0].id);
      } else {
        // No employee record found, return empty
        return res.json([]);
      }
    } else if (employee_id) {
      // If admin/manager and employee_id is specified, filter by it
      conditions.push(`t.employee_id = $${values.length + 1}`);
      values.push(employee_id);
    }

    if (status) {
      conditions.push(`t.status = $${values.length + 1}`);
      values.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Get time off requests error:', error);
    res.status(500).json({ error: 'Failed to fetch time off requests' });
  }
};

const getTimeOffRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT t.*, e.first_name, e.last_name 
       FROM time_off_requests t
       JOIN employees e ON t.employee_id = e.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get time off request error:', error);
    res.status(500).json({ error: 'Failed to fetch time off request' });
  }
};

const reviewTimeOffRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewed_by } = req.body;

    if (!['approved', 'denied'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or denied' });
    }

    const requestResult = await pool.query(
      'SELECT * FROM time_off_requests WHERE id = $1',
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been reviewed' });
    }

    const result = await pool.query(
      `UPDATE time_off_requests 
       SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, reviewed_by, id]
    );

    if (status === 'approved') {
      const currentYear = new Date().getFullYear();
      await pool.query(
        `UPDATE leave_balances 
         SET ${request.leave_type.toLowerCase()}_days = ${request.leave_type.toLowerCase()}_days - $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE employee_id = $2 AND year = $3`,
        [request.days_requested, request.employee_id, currentYear]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Review time off request error:', error);
    res.status(500).json({ error: 'Failed to review time off request' });
  }
};

const deleteTimeOffRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Get the request details first
    const requestResult = await pool.query(
      'SELECT * FROM time_off_requests WHERE id = $1',
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestResult.rows[0];

    // Check permissions - employees can only delete their own requests
    if (user.role !== 'admin' && user.role !== 'manager') {
      if (request.employee_id !== user.employee_id) {
        return res.status(403).json({ error: 'You can only cancel your own requests' });
      }
    }

    // If the request was approved, return the leave days to the balance
    if (request.status === 'approved') {
      const currentYear = new Date().getFullYear();
      const balanceResult = await pool.query(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND year = $2',
        [request.employee_id, currentYear]
      );

      if (balanceResult.rows.length > 0) {
        const leaveTypeField = `${request.leave_type.toLowerCase()}_days`;
        await pool.query(
          `UPDATE leave_balances 
           SET ${leaveTypeField} = ${leaveTypeField} + $1, updated_at = CURRENT_TIMESTAMP
           WHERE employee_id = $2 AND year = $3`,
          [request.days_requested, request.employee_id, currentYear]
        );
      }
    }

    const result = await pool.query(
      'DELETE FROM time_off_requests WHERE id = $1 RETURNING *',
      [id]
    );

    res.json({ message: 'Time off request cancelled successfully' });
  } catch (error) {
    console.error('Delete time off request error:', error);
    res.status(500).json({ error: 'Failed to cancel time off request' });
  }
};

const cancelTimeOffRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Get the request details first
    const requestResult = await pool.query(
      'SELECT * FROM time_off_requests WHERE id = $1',
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestResult.rows[0];

    // Check permissions - employees can only cancel their own requests
    if (user.role !== 'admin' && user.role !== 'manager') {
      // Get the employee_id for this user
      const empResult = await pool.query(
        'SELECT id FROM employees WHERE user_id = $1',
        [user.id]
      );
      
      if (empResult.rows.length === 0 || empResult.rows[0].id !== request.employee_id) {
        return res.status(403).json({ error: 'You can only cancel your own requests' });
      }
    }

    // If the request was approved, return the leave days to the balance
    if (request.status === 'approved') {
      const currentYear = new Date().getFullYear();
      const balanceResult = await pool.query(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND year = $2',
        [request.employee_id, currentYear]
      );

      if (balanceResult.rows.length > 0) {
        const leaveTypeField = `${request.leave_type.toLowerCase()}_days`;
        await pool.query(
          `UPDATE leave_balances 
           SET ${leaveTypeField} = ${leaveTypeField} + $1, updated_at = CURRENT_TIMESTAMP
           WHERE employee_id = $2 AND year = $3`,
          [request.days_requested, request.employee_id, currentYear]
        );
      }
    }

    // Update status to cancelled instead of deleting
    const result = await pool.query(
      `UPDATE time_off_requests 
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json({ message: 'Time off request cancelled successfully', request: result.rows[0] });
  } catch (error) {
    console.error('Cancel time off request error:', error);
    res.status(500).json({ error: 'Failed to cancel time off request' });
  }
};

module.exports = {
  getLeaveBalance,
  updateLeaveBalance,
  createTimeOffRequest,
  getAllTimeOffRequests,
  getTimeOffRequestById,
  reviewTimeOffRequest,
  deleteTimeOffRequest,
  cancelTimeOffRequest
};
