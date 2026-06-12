const pool = require('../config/database');

const clockIn = async (req, res) => {
  try {
    let employeeId = req.body.employee_id;
    
    // If no employee_id provided, get it from the authenticated user
    if (!employeeId && req.user) {
      const empResult = await pool.query(
        'SELECT id FROM employees WHERE user_id = $1',
        [req.user.id]
      );
      if (empResult.rows.length > 0) {
        employeeId = empResult.rows[0].id;
      }
    }
    
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID required' });
    }
    
    const notes = req.body.notes || '';

    // Check if already clocked in
    const existing = await pool.query(
      'SELECT * FROM time_clock WHERE employee_id = $1 AND clock_out IS NULL',
      [employeeId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already clocked in' });
    }

    const result = await pool.query(
      'INSERT INTO time_clock (employee_id, clock_in, status, notes) VALUES ($1, NOW(), $2, $3) RETURNING *',
      [employeeId, 'clocked_in', notes]
    );

    res.status(201).json({
      message: 'Clocked in successfully',
      timeClock: result.rows[0]
    });
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({ error: 'Failed to clock in' });
  }
};

const clockOut = async (req, res) => {
  try {
    let employeeId = req.body.employee_id;
    
    // If no employee_id provided, get it from the authenticated user
    if (!employeeId && req.user) {
      const empResult = await pool.query(
        'SELECT id FROM employees WHERE user_id = $1',
        [req.user.id]
      );
      if (empResult.rows.length > 0) {
        employeeId = empResult.rows[0].id;
      }
    }
    
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID required' });
    }

    // Get current time clock entry
    const current = await pool.query(
      'SELECT * FROM time_clock WHERE employee_id = $1 AND clock_out IS NULL',
      [employeeId]
    );

    if (current.rows.length === 0) {
      return res.status(400).json({ error: 'Not currently clocked in' });
    }

    const timeClock = current.rows[0];
    const clockInTime = new Date(timeClock.clock_in);
    const clockOutTime = new Date();
    
    // Calculate total hours (subtract break time)
    const breakMinutes = timeClock.break_duration || 0;
    const totalMs = clockOutTime - clockInTime - (breakMinutes * 60 * 1000);
    const totalHours = Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;

    const result = await pool.query(
      `UPDATE time_clock 
       SET clock_out = NOW(), 
           total_hours = $1, 
           status = 'clocked_out',
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [totalHours, timeClock.id]
    );

    res.json({
      message: 'Clocked out successfully',
      timeClock: result.rows[0],
      totalHours: totalHours
    });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ error: 'Failed to clock out' });
  }
};

const startBreak = async (req, res) => {
  try {
    let employeeId = req.body.employee_id;
    
    // If no employee_id provided, get it from the authenticated user
    if (!employeeId && req.user) {
      const empResult = await pool.query(
        'SELECT id FROM employees WHERE user_id = $1',
        [req.user.id]
      );
      if (empResult.rows.length > 0) {
        employeeId = empResult.rows[0].id;
      }
    }
    
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID required' });
    }

    // Get current time clock entry
    const current = await pool.query(
      'SELECT * FROM time_clock WHERE employee_id = $1 AND clock_out IS NULL AND status = $2',
      [employeeId, 'clocked_in']
    );

    if (current.rows.length === 0) {
      return res.status(400).json({ error: 'Must be clocked in to start a break' });
    }

    const result = await pool.query(
      `UPDATE time_clock 
       SET break_start = NOW(), 
           status = 'on_break',
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [current.rows[0].id]
    );

    res.json({
      message: 'Break started',
      timeClock: result.rows[0]
    });
  } catch (error) {
    console.error('Start break error:', error);
    res.status(500).json({ error: 'Failed to start break' });
  }
};

const endBreak = async (req, res) => {
  try {
    let employeeId = req.body.employee_id;
    
    // If no employee_id provided, get it from the authenticated user
    if (!employeeId && req.user) {
      const empResult = await pool.query(
        'SELECT id FROM employees WHERE user_id = $1',
        [req.user.id]
      );
      if (empResult.rows.length > 0) {
        employeeId = empResult.rows[0].id;
      }
    }
    
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID required' });
    }

    // Get current time clock entry
    const current = await pool.query(
      'SELECT * FROM time_clock WHERE employee_id = $1 AND break_start IS NOT NULL AND break_end IS NULL',
      [employeeId]
    );

    if (current.rows.length === 0) {
      return res.status(400).json({ error: 'Not currently on break' });
    }

    const timeClock = current.rows[0];
    const breakStart = new Date(timeClock.break_start);
    const breakEnd = new Date();
    const breakMinutes = Math.round((breakEnd - breakStart) / (1000 * 60));
    
    // Add to existing break duration
    const totalBreakMinutes = (timeClock.break_duration || 0) + breakMinutes;

    const result = await pool.query(
      `UPDATE time_clock 
       SET break_end = NOW(), 
           break_duration = $1,
           status = 'clocked_in',
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [totalBreakMinutes, timeClock.id]
    );

    res.json({
      message: 'Break ended',
      timeClock: result.rows[0],
      breakMinutes: breakMinutes,
      totalBreakMinutes: totalBreakMinutes
    });
  } catch (error) {
    console.error('End break error:', error);
    res.status(500).json({ error: 'Failed to end break' });
  }
};

const getCurrentStatus = async (req, res) => {
  try {
    const employeeId = req.params.employeeId || req.user.employee_id;

    const result = await pool.query(
      `SELECT tc.*, e.first_name, e.last_name, t.name as team_name, t.color as team_color
       FROM time_clock tc
       JOIN employees e ON tc.employee_id = e.id
       LEFT JOIN teams t ON e.team_id = t.id
       WHERE tc.employee_id = $1 AND tc.clock_out IS NULL
       ORDER BY tc.clock_in DESC
       LIMIT 1`,
      [employeeId]
    );

    if (result.rows.length === 0) {
      return res.json({ status: 'clocked_out', employee: null });
    }

    res.json({
      status: result.rows[0].status,
      timeClock: result.rows[0]
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
};

const getTeamStatus = async (req, res) => {
  try {
    const { team_id } = req.query;
    
    // Get all employees who are currently clocked in or on break
    const result = await pool.query(
      `SELECT DISTINCT ON (tc.employee_id) 
         tc.*, 
         e.first_name, 
         e.last_name, 
         e.team_id,
         t.name as team_name,
         t.color as team_color,
         s.start_time as scheduled_start
       FROM time_clock tc
       JOIN employees e ON tc.employee_id = e.id
       LEFT JOIN teams t ON e.team_id = t.id
       LEFT JOIN LATERAL (
         SELECT start_time FROM shifts 
         WHERE employee_id = e.id 
         AND DATE(start_time) = CURRENT_DATE 
         ORDER BY start_time ASC 
         LIMIT 1
       ) s ON true
       WHERE tc.clock_out IS NULL
       ${team_id ? 'AND e.team_id = $1' : ''}
       ORDER BY tc.employee_id, tc.clock_in DESC`,
      team_id ? [team_id] : []
    );

    // Determine late status
    const now = new Date();
    const teamStatus = result.rows.map(person => {
      const scheduledStart = person.scheduled_start ? new Date(person.scheduled_start) : null;
      const clockInTime = new Date(person.clock_in);
      const isLate = scheduledStart && clockInTime > scheduledStart;
      const minutesLate = isLate ? Math.round((clockInTime - scheduledStart) / (1000 * 60)) : 0;

      return {
        employee_id: person.employee_id,
        first_name: person.first_name,
        last_name: person.last_name,
        team_name: person.team_name,
        team_color: person.team_color,
        status: person.status,
        clock_in: person.clock_in,
        break_duration: person.break_duration,
        scheduled_start: person.scheduled_start,
        is_late: isLate,
        minutes_late: minutesLate
      };
    });

    res.json(teamStatus);
  } catch (error) {
    console.error('Get team status error:', error);
    res.status(500).json({ error: 'Failed to get team status' });
  }
};

const getTimeHistory = async (req, res) => {
  try {
    const employeeId = req.params.employeeId || req.user.employee_id;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT tc.*, e.first_name, e.last_name
      FROM time_clock tc
      JOIN employees e ON tc.employee_id = e.id
      WHERE tc.employee_id = $1
    `;
    
    const values = [employeeId];
    const conditions = [];

    if (startDate) {
      conditions.push(`tc.clock_in >= $${values.length + 1}`);
      values.push(startDate);
    }

    if (endDate) {
      conditions.push(`tc.clock_in <= $${values.length + 1}`);
      values.push(endDate);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY tc.clock_in DESC LIMIT 30';

    const result = await pool.query(query, values);

    res.json(result.rows);
  } catch (error) {
    console.error('Get time history error:', error);
    res.status(500).json({ error: 'Failed to get time history' });
  }
};

module.exports = {
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  getCurrentStatus,
  getTeamStatus,
  getTimeHistory
};
