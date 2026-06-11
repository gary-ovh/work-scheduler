const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: 'postgres'
});

const setupDatabase = async () => {
  try {
    console.log('Setting up database...');
    
    // Check if database exists
    const dbExists = await pool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [process.env.DB_NAME]
    );

    if (dbExists.rows.length > 0) {
      console.log(`Database "${process.env.DB_NAME}" already exists, dropping...`);
      await pool.query(`DROP DATABASE ${process.env.DB_NAME}`);
    }

    // Check if user exists
    const userExists = await pool.query(
      'SELECT 1 FROM pg_roles WHERE rolname = $1',
      [process.env.DB_USER]
    );

    if (userExists.rows.length > 0) {
      console.log(`User "${process.env.DB_USER}" already exists, dropping...`);
      await pool.query(`DROP USER ${process.env.DB_USER}`);
    }
    
    // Create user with CREATEDB privilege
    console.log(`Creating user "${process.env.DB_USER}"...`);
    await pool.query(
      `CREATE USER ${process.env.DB_USER} WITH PASSWORD '${process.env.DB_PASSWORD}' CREATEDB`
    );

    // Create database
    console.log(`Creating database "${process.env.DB_NAME}"...`);
    await pool.query(`CREATE DATABASE ${process.env.DB_NAME} OWNER ${process.env.DB_USER}`);

    await pool.end();

    const dbPool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    console.log('Creating tables...');
    
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, 'models', 'database.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await dbPool.query(sql);
    console.log('Tables created successfully');

    console.log('Creating sample admin user...');
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await dbPool.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
      ['admin@example.com', hashedPassword, 'admin']
    );

    await dbPool.query(
      'INSERT INTO employees (user_id, first_name, last_name, position) VALUES (1, $1, $2, $3)',
      ['Admin', 'User', 'Administrator']
    );

    console.log('Creating sample employee...');
    const empHashedPassword = await bcrypt.hash('employee123', 10);
    
    const empResult = await dbPool.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id',
      ['employee@example.com', empHashedPassword, 'employee']
    );

    const empId = empResult.rows[0].id;

    await dbPool.query(
      'INSERT INTO employees (user_id, first_name, last_name, position, hourly_rate) VALUES ($1, $2, $3, $4, $5)',
      [empId, 'John', 'Employee', 'Cashier', 15.00]
    );

    const currentYear = new Date().getFullYear();
    await dbPool.query(
      `INSERT INTO leave_balances (employee_id, vacation_days, sick_days, flexible_days, year) 
       VALUES ($1, $2, $3, $4, $5)`,
      [empId, 10, 5, 3, currentYear]
    );

    console.log('Creating sample teams...');
    await dbPool.query(
      `INSERT INTO teams (name, description, color) VALUES
       ('Morning Team', 'Early morning shift team', '#4CAF50'),
       ('Evening Team', 'Evening shift team', '#FF9800'),
       ('Weekend Team', 'Weekend coverage team', '#9C27B0')`
    );

    console.log('Creating sample shift templates...');
    await dbPool.query(
      `INSERT INTO shift_templates (name, start_time, end_time, position, color, created_by) VALUES
       ('Morning Shift', '06:00:00', '14:00:00', 'General', '#4CAF50', 1),
       ('Evening Shift', '14:00:00', '22:00:00', 'General', '#FF9800', 1),
       ('Night Shift', '22:00:00', '06:00:00', 'General', '#3F51B5', 1),
       ('Opening Shift', '05:00:00', '13:00:00', 'Cashier', '#00BCD4', 1),
       ('Closing Shift', '20:00:00', '04:00:00', 'Supervisor', '#E91E63', 1)`
    );

    console.log('Sample admin user created:');
    console.log('  Email: admin@example.com');
    console.log('  Password: admin123');
    console.log('\nSample employee user created:');
    console.log('  Email: employee@example.com');
    console.log('  Password: employee123');
    console.log(`  Leave Balance: 10 vacation, 5 sick, 3 flexible days`);

    await dbPool.end();
    console.log('\nDatabase setup complete!');
  } catch (error) {
    console.error('Error setting up database:', error.message);
    process.exit(1);
  }
};

setupDatabase();
