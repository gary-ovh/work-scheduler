const { exec } = require('child_process');
const os = require('os');

const PORT = process.env.PORT || 5000;

const killPort = () => {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    
    console.log(`Checking for processes on port ${PORT}...`);
    
    if (platform === 'win32') {
      // Windows: Find PID using port 5000
      exec(`netstat -ano | findstr :${PORT}`, (error, stdout) => {
        if (error) {
          console.log(`Port ${PORT} is available`);
          return resolve();
        }
        
        const lines = stdout.split('\n');
        const pids = [];
        
        lines.forEach(line => {
          if (line.includes(`:${PORT}`)) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && !pids.includes(pid)) {
              pids.push(pid);
            }
          }
        });
        
        if (pids.length === 0) {
          console.log(`Port ${PORT} is available`);
          return resolve();
        }
        
        console.log(`Found ${pids.length} process(es) on port ${PORT}: ${pids.join(', ')}`);
        console.log('Killing process(es)...');
        
        // Kill each process
        pids.forEach((pid, index) => {
          exec(`taskkill /PID ${pid} /F`, (err) => {
            if (err) {
              console.error(`Failed to kill PID ${pid}:`, err.message);
            } else {
              console.log(`Killed PID ${pid}`);
            }
            
            // Resolve after last process
            if (index === pids.length - 1) {
              resolve();
            }
          });
        });
      });
    } else {
      // Linux/Mac: Find PID using port 5000
      exec(`lsof -ti:${PORT}`, (error, stdout) => {
        if (error) {
          console.log(`Port ${PORT} is available`);
          return resolve();
        }
        
        const pids = stdout.trim().split('\n').filter(pid => pid);
        
        if (pids.length === 0) {
          console.log(`Port ${PORT} is available`);
          return resolve();
        }
        
        console.log(`Found ${pids.length} process(es) on port ${PORT}: ${pids.join(', ')}`);
        console.log('Killing process(es)...');
        
        // Kill each process
        pids.forEach((pid) => {
          exec(`kill -9 ${pid}`, (err) => {
            if (err) {
              console.error(`Failed to kill PID ${pid}:`, err.message);
            } else {
              console.log(`Killed PID ${pid}`);
            }
          });
        });
        
        // Wait a bit then resolve
        setTimeout(resolve, 500);
      });
    }
  });
};

module.exports = killPort;
