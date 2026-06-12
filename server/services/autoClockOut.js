const pool = require('../config/database');

/**
 * Automatically clock out employees who are still clocked in 30 minutes after their shift ends
 * Runs every 30 minutes
 */
const autoClockOut = async () => {
  try {
    console.log('[Auto Clock-Out] Checking for employees to auto clock-out...');
    
    const now = new Date();
    
    // Find all employees who are clocked in and their shift ended more than 30 minutes ago
    const result = await pool.query(`
      SELECT DISTINCT ON (tc.employee_id)
        tc.id as time_clock_id,
        tc.employee_id,
        e.first_name,
        e.last_name,
        s.end_time as scheduled_end,
        tc.clock_in,
        tc.break_duration
      FROM time_clock tc
      JOIN employees e ON tc.employee_id = e.id
      LEFT JOIN LATERAL (
        SELECT end_time FROM shifts 
        WHERE employee_id = tc.employee_id 
        AND DATE(start_time) = CURRENT_DATE 
        AND end_time < NOW()
        ORDER BY end_time DESC 
        LIMIT 1
      ) s ON true
      WHERE tc.clock_out IS NULL
        AND tc.status IN ('clocked_in', 'on_break')
        AND s.end_time IS NOT NULL
        AND NOW() > s.end_time + INTERVAL '30 minutes'
      ORDER BY tc.employee_id
    `);

    if (result.rows.length === 0) {
      console.log('[Auto Clock-Out] No employees need to be auto clocked-out');
      return;
    }

    console.log(`[Auto Clock-Out] Auto clocking out ${result.rows.length} employee(s)...`);

    for (const employee of result.rows) {
      const clockInTime = new Date(employee.clock_in);
      const clockOutTime = now;
      const breakMinutes = employee.break_duration || 0;
      
      // Calculate total hours (subtract break time)
      const totalMs = clockOutTime - clockInTime - (breakMinutes * 60 * 1000);
      const totalHours = Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;

      await pool.query(
        `UPDATE time_clock 
         SET clock_out = NOW(), 
             total_hours = $1, 
             status = 'clocked_out',
             notes = COALESCE(notes, '') || ' [AUTO-CLOCKED-OUT]',
             updated_at = NOW()
         WHERE id = $2`,
        [totalHours, employee.time_clock_id]
      );

      console.log(`[Auto Clock-Out] Clocked out ${employee.first_name} ${employee.last_name} - Total hours: ${totalHours}`);
    }

    console.log('[Auto Clock-Out] Completed successfully');
  } catch (error) {
    console.error('[Auto Clock-Out] Error:', error);
  }
};

// Start the auto clock-out service
const startAutoClockOutService = () => {
  console.log('[Auto Clock-Out] Service started - will run every 30 minutes');
  
  // Run immediately on startup (after a 1-minute delay to ensure server is ready)
  setTimeout(() => {
    autoClockOut();
  }, 60 * 1000);
  
  // Then run every 30 minutes
  setInterval(autoClockOut, 30 * 60 * 1000);
};

module.exports = { startAutoClockOutService, autoClockOut };
