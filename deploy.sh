#!/bin/bash

set -e

echo "==================================="
echo "Work Scheduler - Ubuntu Deployment"
echo "==================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root or with sudo${NC}"
  exit 1
fi

# Update system
echo -e "${YELLOW}Updating system packages...${NC}"
apt update && apt upgrade -y

# Install Node.js 18 LTS
echo -e "${YELLOW}Installing Node.js 18 LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Install PostgreSQL
echo -e "${YELLOW}Installing PostgreSQL...${NC}"
apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Install PM2
echo -e "${YELLOW}Installing PM2...${NC}"
npm install -g pm2

# Get project directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Database setup
echo ""
echo -e "${YELLOW}Database Setup${NC}"
echo "Enter PostgreSQL password for 'postgres' user (or press enter for no password):"
read -s PG_PASSWORD
echo ""

# Create database
sudo -u postgres psql -c "DROP DATABASE IF EXISTS work_scheduler;" 2>/dev/null || true
sudo -u postgres psql -c "DROP USER IF EXISTS work_scheduler;" 2>/dev/null || true

if [ -z "$PG_PASSWORD" ]; then
  sudo -u postgres psql -c "CREATE USER work_scheduler WITH NOSUPERUSER INHERIT NOCREATEDB NOCREATEROLE NOREPLICATION;"
  sudo -u postgres psql -c "CREATE DATABASE work_scheduler OWNER work_scheduler;"
else
  sudo -u postgres psql -c "CREATE USER work_scheduler WITH PASSWORD '$PG_PASSWORD' NOSUPERUSER INHERIT NOCREATEDB NOCREATEROLE NOREPLICATION;"
  sudo -u postgres psql -c "CREATE DATABASE work_scheduler OWNER work_scheduler;"
fi

echo -e "${GREEN}Database created successfully${NC}"

# Create .env file
echo -e "${YELLOW}Creating .env file...${NC}"
JWT_SECRET=$(openssl rand -hex 32)

cat > server/.env << EOF
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=work_scheduler
DB_USER=work_scheduler
DB_PASSWORD=$PG_PASSWORD
JWT_SECRET=$JWT_SECRET
NODE_ENV=production
EOF

echo -e "${GREEN}.env file created${NC}"

# Run database migrations
echo -e "${YELLOW}Setting up database schema...${NC}"
cd server
npm run setup-db
cd ..

# Build frontend
echo -e "${YELLOW}Building frontend...${NC}"
cd client
npm run build
cd ..

# Install serve for static files
npm install -g serve

# Stop existing PM2 processes
pm2 delete work-scheduler-api 2>/dev/null || true
pm2 delete work-scheduler-web 2>/dev/null || true

# Start backend with PM2
echo -e "${YELLOW}Starting application with PM2...${NC}"
pm2 start server/server.js --name work-scheduler-api --env production

# Start frontend with PM2
pm2 start --name work-scheduler-web -- serve client/dist -l 3000

# Save PM2 configuration
pm2 save

# Setup PM2 startup
echo ""
echo -e "${YELLOW}Setting up PM2 to start on boot...${NC}"
pm2 startup systemd -u root --hp /root

echo ""
echo -e "${GREEN}==================================="
echo "Deployment Complete!"
echo "===================================${NC}"
echo ""
echo "Services running:"
echo "  - API: http://localhost:5000"
echo "  - Frontend: http://localhost:3000"
echo ""
echo "PM2 Commands:"
echo "  pm2 list              # View running processes"
echo "  pm2 logs              # View logs"
echo "  pm2 restart all       # Restart all services"
echo "  pm2 monit             # Monitor resources"
echo ""
echo "Default Login:"
echo "  Admin: admin@example.com / admin123"
echo "  Employee: employee@example.com / employee123"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Configure nginx (see DEPLOY.md)"
echo "  2. Setup HTTPS with Let's Encrypt"
echo "  3. Configure firewall (ufw)"
echo ""
