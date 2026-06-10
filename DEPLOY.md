# Ubuntu Deployment Guide

This guide covers deploying the Work Scheduler application on an Ubuntu server.

## Prerequisites

- Ubuntu 20.04 or higher
- sudo/root access
- Domain name (optional, for HTTPS)

## Quick Deploy Script

Save this as `deploy.sh` on your Ubuntu server:

```bash
#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (v18 LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 for process management
sudo npm install -g pm2

# Clone or copy your project
# cd /var/www/work-scheduler

# Install dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Setup database
echo "Enter your PostgreSQL password for postgres user:"
read -s PG_PASSWORD

sudo -u postgres psql -c "CREATE DATABASE work_scheduler;"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '$PG_PASSWORD';"

# Create .env file
cat > server/.env << EOF
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=work_scheduler
DB_USER=postgres
DB_PASSWORD=$PG_PASSWORD
JWT_SECRET=$(openssl rand -hex 32)
EOF

# Run database migrations
cd server
npm run setup-db
cd ..

# Build frontend
cd client
npm run build
cd ..

# Start with PM2
pm2 start server/server.js --name work-scheduler-api
pm2 start --name work-scheduler-client -- npm run dev

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup

echo "Deployment complete!"
echo "API running on: http://localhost:5000"
echo "Frontend running on: http://localhost:3000"
```

Make it executable and run:
```bash
chmod +x deploy.sh
./deploy.sh
```

## Manual Installation Steps

### 1. Install Node.js

```bash
# Using NodeSource repository for Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 2. Install PostgreSQL

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

### 3. Create Database

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE work_scheduler;
\password postgres
\q

# Or create a dedicated user
# sudo -u postgres createuser -P work_scheduler
# sudo -u postgres createdb -O work_scheduler work_scheduler
```

### 4. Setup Application

```bash
# Navigate to your project directory
cd /var/www/work-scheduler

# Install dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Configure environment
cd server
cp .env.example .env
nano .env  # Edit with your database credentials
cd ..
```

### 5. Setup Database Schema

```bash
cd server
npm run setup-db
cd ..
```

### 6. Build Frontend

```bash
cd client
npm run build
cd ..
```

### 7. Install PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Start backend API
pm2 start server/server.js --name work-scheduler-api

# For production, serve built frontend with a static server
# Option 1: Use serve package
npm install -g serve
pm2 start --name work-scheduler-web -- serve client/dist -l 3000

# Or Option 2: Use nginx (recommended for production)

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs
```

### 8. Configure Nginx (Production)

```bash
sudo apt install -y nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/work-scheduler
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/work-scheduler/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable the site:**
```bash
sudo ln -s /etc/nginx/sites-available/work-scheduler /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9. Setup HTTPS with Let's Encrypt (Optional but Recommended)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Environment Variables

Update `server/.env`:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=work_scheduler
DB_USER=postgres
DB_PASSWORD=your_secure_password
JWT_SECRET=your_very_secure_random_secret_here
NODE_ENV=production
```

## Useful PM2 Commands

```bash
# View running processes
pm2 list

# View logs
pm2 logs work-scheduler-api
pm2 logs work-scheduler-web

# Restart application
pm2 restart work-scheduler-api

# Stop application
pm2 stop work-scheduler-api

# Monitor
pm2 monit
```

## Firewall Configuration

```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Or if not using nginx, allow specific ports
sudo ufw allow 5000/tcp
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable
```

## Automated Updates (Optional)

Create a simple update script:

```bash
#!/bin/bash
cd /var/www/work-scheduler
git pull
npm install
cd server && npm install && cd ..
cd client && npm install && npm run build && cd ..
pm2 restart work-scheduler-api
```

## Troubleshooting

**PostgreSQL connection errors:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check pg_hba.conf allows local connections
sudo nano /etc/postgresql/14/main/pg_hba.conf
# Ensure: local   all   all   md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

**Permission errors:**
```bash
# Set proper ownership
sudo chown -R $USER:$USER /var/www/work-scheduler

# Set proper permissions
chmod -R 755 /var/www/work-scheduler
```

**Port already in use:**
```bash
# Find process using port
sudo lsof -i :5000

# Kill the process
sudo kill -9 <PID>
```
