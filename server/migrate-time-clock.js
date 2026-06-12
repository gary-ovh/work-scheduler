const { Pool } = require('pg');

// Connect as postgres superuser
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || '5432',
  user: 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'work_scheduler'
});

const migrateTimeClock = async () => {
  try {
    console.log('Running time clock migration...');
    
    // Create time_clock table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS time_clock (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        clock_in TIMESTAMP NOT NULL,
        clock_out TIMESTAMP,
        break_start TIMESTAMP,
        break_end TIMESTAMP,
        total_hours DECIMAL(10, 2) DEFAULT 0,
        break_duration INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'clocked_out',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ time_clock table created/verified');
    
    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_time_clock_employee ON time_clock(employee_id);
      CREATE INDEX IF NOT EXISTS idx_time_clock_status ON time_clock(status);
      CREATE INDEX IF NOT EXISTS idx_time_clock_clock_in ON time_clock(clock_in);
    `);
    console.log('✓ Indexes created');
    
    // Grant permissions to work_scheduler user
    await pool.query(`
      GRANT ALL PRIVILEGES ON TABLE time_clock TO work_scheduler;
      GRANT USAGE, SELECT ON SEQUENCE time_clock_id_seq TO work_scheduler;
    `);
    console.log('✓ Permissions granted to work_scheduler user');
    
    console.log('\nTime clock migration completed successfully!');
    console.log('\nEmployees can now:');
    console.log('  - Clock in/out via the Time Clock page');
    console.log('  - Take breaks during their shift');
    console.log('  - View team members who are currently clocked in');
    console.log('  - See who is late based on scheduled shifts');
    
    await pool.end();
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  }
};

migrateTimeClock();
