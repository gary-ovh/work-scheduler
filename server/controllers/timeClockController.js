const pool = require('../config/database');

const clockIn = async (req, res) => {
  try {
    let employeeId = req.body.employee_id;
    const isAdminClocking = req.body.for_employee; // Flag for admin clocking in employee
    
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

    // Check if clocking in more than 15 minutes before scheduled shift (skip for admin clock-in)
    if (!isAdminClocking) {
      const now = new Date();
      const shiftCheck = await pool.query(
        `SELECT start_time FROM shifts 
         WHERE employee_id = $1 
         AND DATE(start_time) = CURRENT_DATE 
         AND start_time > NOW()
         ORDER BY start_time ASC 
         LIMIT 1`,
        [employeeId]
      );

      if (shiftCheck.rows.length > 0) {
        const scheduledStart = new Date(shiftCheck.rows[0].start_time);
        const earliestClockIn = new Date(scheduledStart.getTime() - 15 * 60 * 1000); // 15 minutes before
        
        if (now < earliestClockIn) {
          const minutesUntilEarliest = Math.round((earliestClockIn - now) / (1000 * 60));
          return res.status(400).json({ 
            error: `Too early to clock in. You can clock in ${minutesUntilEarliest} minutes before your shift starts.`,
            earliestClockIn: earliestClockIn.toISOString()
          });
        }
      }
    }

    const result = await pool.query(
      'INSERT INTO time_clock (employee_id, clock_in, status, notes, created_by) VALUES ($1, NOW(), $2, $3, $4) RETURNING *',
      [employeeId, 'clocked_in', notes, isAdminClocking ? req.user.id : null]
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
          tc.employee_id,
          tc.status,
          tc.break_duration,
          TO_CHAR(tc.clock_in, 'YYYY-MM-DD HH24:MI:SS') as clock_in,
          e.first_name, 
          e.last_name, 
          e.team_id,
          t.name as team_name,
          t.color as team_color,
          TO_CHAR(s.start_time, 'YYYY-MM-DD HH24:MI:SS') as scheduled_start
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

    // Return raw data - frontend calculates late status using local browser time
    const teamStatus = result.rows.map(person => ({
      employee_id: person.employee_id,
      first_name: person.first_name,
      last_name: person.last_name,
      team_name: person.team_name,
      team_color: person.team_color,
      status: person.status,
      clock_in: person.clock_in,
      break_duration: person.break_duration,
      scheduled_start: person.scheduled_start
    }));

    res.json(teamStatus);
  } catch (error) {
    console.error('Get team status error:', error);
    res.status(500).json({ error: 'Failed to get team status' });
  }
};

const getLateEmployees = async (req, res) => {
  try {
    const { team_id } = req.query;
    
    console.log('getLateEmployees called - CURRENT_DATE (UTC):', new Date().toISOString());

    // Find employees who have a shift that started but are NOT clocked in
    const result = await pool.query(
      `SELECT DISTINCT ON (e.id)
          e.id as employee_id,
          e.first_name,
          e.last_name,
          e.team_id,
          t.name as team_name,
          t.color as team_color,
          TO_CHAR(s.start_time, 'YYYY-MM-DD HH24:MI:SS') as scheduled_start,
          TO_CHAR(s.end_time, 'YYYY-MM-DD HH24:MI:SS') as scheduled_end,
          s.start_time as raw_start_time,
          tc.status as current_status
        FROM employees e
        JOIN shifts s ON e.id = s.employee_id
        LEFT JOIN teams t ON e.team_id = t.id
        LEFT JOIN LATERAL (
          SELECT employee_id, status, clock_in
          FROM time_clock
          WHERE employee_id = e.id
          AND clock_out IS NULL
          ORDER BY clock_in DESC
          LIMIT 1
        ) tc ON true
        WHERE DATE(s.start_time) = CURRENT_DATE
          AND s.start_time <= NOW()
          AND (tc.status IS NULL OR tc.status = 'clocked_out')
          ${team_id ? 'AND e.team_id = $1' : ''}
        ORDER BY e.id, s.start_time ASC`,
      team_id ? [team_id] : []
    );
    
    console.log('Late employees query result:', {
      rowCount: result.rows.length,
      rows: result.rows.map(r => ({
        id: r.employee_id,
        name: `${r.first_name} ${r.last_name}`,
        scheduled_start: r.scheduled_start,
        raw_start_time: r.raw_start_time,
        status: r.current_status
      })),
      team_id
    });

    // Return raw data - frontend calculates late status using local time
    const lateEmployees = result.rows.map(emp => ({
      employee_id: emp.employee_id,
      first_name: emp.first_name,
      last_name: emp.last_name,
      team_name: emp.team_name,
      team_color: emp.team_color,
      scheduled_start: emp.scheduled_start,
      scheduled_end: emp.scheduled_end,
      status: 'not_clocked_in'
    }));
    
    console.log('Returning late employees:', lateEmployees.length);

    res.json(lateEmployees);
  } catch (error) {
    console.error('Get late employees error:', error);
    res.status(500).json({ error: 'Failed to get late employees' });
  }
};

const getTimeHistory = async (req, res) => {
  try {
    const employeeId = req.params.employeeId || req.user.employee_id;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT tc.employee_id, tc.status, tc.break_duration, tc.total_hours, tc.break_duration as break_duration_val,
        TO_CHAR(tc.clock_in, 'YYYY-MM-DD HH24:MI:SS') as clock_in,
        TO_CHAR(tc.clock_out, 'YYYY-MM-DD HH24:MI:SS') as clock_out,
        TO_CHAR(tc.break_start, 'YYYY-MM-DD HH24:MI:SS') as break_start,
        TO_CHAR(tc.break_end, 'YYYY-MM-DD HH24:MI:SS') as break_end,
        tc.notes,
        e.first_name, e.last_name,
        TO_CHAR(s.start_time, 'YYYY-MM-DD HH24:MI:SS') as scheduled_start,
        TO_CHAR(s.end_time, 'YYYY-MM-DD HH24:MI:SS') as scheduled_end
      FROM time_clock tc
      JOIN employees e ON tc.employee_id = e.id
      LEFT JOIN LATERAL (
        SELECT start_time, end_time FROM shifts 
        WHERE employee_id = tc.employee_id 
        AND DATE(start_time) = DATE(tc.clock_in)
        ORDER BY start_time ASC 
        LIMIT 1
      ) s ON true
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

    query += ' ORDER BY tc.clock_in DESC LIMIT 100';

    const result = await pool.query(query, values);

    // Return raw data - frontend calculates late status using local browser time
    const records = result.rows.map(record => ({
      ...record,
      is_late: null,
      minutes_late: null
    }));

    res.json(records);
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
  getLateEmployees,
  getTimeHistory
};
