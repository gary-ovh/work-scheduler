const { Pool } = require('pg');

// Connect as postgres superuser
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || '5432',
  user: 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'work_scheduler'
});

const migrateTeams = async () => {
  try {
    console.log('Running teams migration as postgres...');
    
    // Create teams table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        color VARCHAR(7) DEFAULT '#007bff',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Teams table created/verified');
    
    // Add team_id to employees table if not exists
    await pool.query(`
      ALTER TABLE employees 
      ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL
    `);
    console.log('✓ team_id column added to employees table');
    
    // Create indexes if not exist
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_team ON employees(team_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active)
    `);
    console.log('✓ Indexes created');
    
    // Insert sample teams (ignore if exist)
    await pool.query(`
      INSERT INTO teams (name, description, color) VALUES
        ('Morning Team', 'Early morning shift team', '#4CAF50'),
        ('Evening Team', 'Evening shift team', '#FF9800'),
        ('Weekend Team', 'Weekend coverage team', '#9C27B0')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✓ Sample teams inserted');
    
    // Grant permissions to work_scheduler user
    await pool.query(`
      GRANT ALL PRIVILEGES ON TABLE teams TO work_scheduler;
      GRANT USAGE, SELECT ON SEQUENCE teams_id_seq TO work_scheduler;
      GRANT ALL PRIVILEGES ON TABLE employees TO work_scheduler;
    `);
    console.log('✓ Permissions granted to work_scheduler user');
    
    console.log('\nMigration completed successfully!');
    await pool.end();
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  }
};

migrateTeams();
