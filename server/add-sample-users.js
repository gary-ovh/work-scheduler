const bcrypt = require('bcrypt');
const pool = require('./config/database');

const addSampleUsers = async () => {
  try {
    console.log('Creating sample users...');

    // Check if admin already exists
    const adminCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@example.com']
    );

    if (adminCheck.rows.length > 0) {
      console.log('Admin user already exists, updating password...');
      const adminHashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'UPDATE users SET password = $1 WHERE email = $2',
        [adminHashedPassword, 'admin@example.com']
      );
    } else {
      console.log('Creating admin user...');
      const adminHashedPassword = await bcrypt.hash('admin123', 10);
      
      const adminResult = await pool.query(
        `INSERT INTO users (email, password, role) 
         VALUES ($1, $2, $3) 
         RETURNING id`,
        ['admin@example.com', adminHashedPassword, 'admin']
      );
      
      await pool.query(
        `INSERT INTO employees (user_id, first_name, last_name, position) 
         VALUES ($1, $2, $3, $4)`,
        [adminResult.rows[0].id, 'Admin', 'User', 'Administrator']
      );
    }

    // Check if employee already exists
    const empCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['employee@example.com']
    );

    let empUserId;
    
    if (empCheck.rows.length > 0) {
      console.log('Employee user already exists, updating password...');
      empUserId = empCheck.rows[0].id;
      const empHashedPassword = await bcrypt.hash('employee123', 10);
      await pool.query(
        'UPDATE users SET password = $1 WHERE email = $2',
        [empHashedPassword, 'employee@example.com']
      );
    } else {
      console.log('Creating employee user...');
      const empHashedPassword = await bcrypt.hash('employee123', 10);
      
      const empResult = await pool.query(
        `INSERT INTO users (email, password, role) 
         VALUES ($1, $2, $3) 
         RETURNING id`,
        ['employee@example.com', empHashedPassword, 'employee']
      );
      
      empUserId = empResult.rows[0].id;
    }
    
    // Check if employee record exists
    const empProfileCheck = await pool.query(
      'SELECT id FROM employees WHERE user_id = $1',
      [empUserId]
    );
    
    if (empProfileCheck.rows.length === 0) {
      console.log('Creating employee profile...');
      await pool.query(
        `INSERT INTO employees (user_id, first_name, last_name, position, hourly_rate) 
         VALUES ($1, $2, $3, $4, $5)`,
        [empUserId, 'John', 'Employee', 'Cashier', 15.00]
      );
    }

    // Get employee_id for leave balance
    const empForBalance = await pool.query(
      'SELECT id FROM employees WHERE user_id = (SELECT id FROM users WHERE email = $1)',
      ['employee@example.com']
    );

    if (empForBalance.rows.length > 0) {
      const currentYear = new Date().getFullYear();
      
      // Check if leave balance already exists
      const balanceCheck = await pool.query(
        'SELECT id FROM leave_balances WHERE employee_id = $1',
        [empForBalance.rows[0].id]
      );
      
      if (balanceCheck.rows.length > 0) {
        // Update existing
        await pool.query(
          `UPDATE leave_balances 
           SET vacation_days = $1, sick_days = $2, flexible_days = $3, year = $4, updated_at = CURRENT_TIMESTAMP
           WHERE employee_id = $5`,
          [10, 5, 3, currentYear, empForBalance.rows[0].id]
        );
      } else {
        // Insert new
        await pool.query(
          `INSERT INTO leave_balances (employee_id, vacation_days, sick_days, flexible_days, year)
           VALUES ($1, $2, $3, $4, $5)`,
          [empForBalance.rows[0].id, 10, 5, 3, currentYear]
        );
      }
    }

    console.log('\n✅ Sample users created/updated successfully!');
    console.log('\nLogin credentials:');
    console.log('  Admin:    admin@example.com / admin123');
    console.log('  Employee: employee@example.com / employee123');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating users:', error.message);
    console.error(error);
    process.exit(1);
  }
};

addSampleUsers();
