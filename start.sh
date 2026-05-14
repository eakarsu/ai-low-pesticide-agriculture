#!/bin/bash

BACKEND_PORT=3001
FRONTEND_PORT=5173
DB_NAME="agri_db"

echo "Starting AgriSense..."

# Kill processes on used ports
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
sleep 1

# Load environment
set -a; [ -f .env ] && source .env; set +a

# Setup database
echo "Setting up database..."
createdb $DB_NAME 2>/dev/null || true
psql -d $DB_NAME -f backend/db/schema.sql -q
psql -d $DB_NAME -f backend/db/seed.sql -q
echo "Database ready"

# Install dependencies
echo "Installing dependencies..."
(cd backend && npm install --silent)
(cd frontend && npm install --silent)

# Start backend
echo "Starting backend on port $BACKEND_PORT..."
(cd backend && npx nodemon server.js) &

sleep 2

# Start frontend
echo "Starting frontend on port $FRONTEND_PORT..."
(cd frontend && npm run dev) &

echo ""
echo "Running!"
echo "   App:    http://localhost:$FRONTEND_PORT"
echo "   API:    http://localhost:$BACKEND_PORT"
echo "   Login:  admin@demo.com / demo123"
echo ""
echo "Press Ctrl+C to stop"
trap 'kill $(jobs -p) 2>/dev/null' EXIT
wait
