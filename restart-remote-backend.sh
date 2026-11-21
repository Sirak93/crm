#!/bin/bash

# Exit on any error
set -e

cd "$(dirname "$0")"

# Load NVM if it exists
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Ensure Node 22 is used
if command -v nvm &> /dev/null; then
    nvm use 22 || nvm install 22
else
    echo "NVM not found. Please ensure Node.js 22 is installed."
    exit 1
fi

echo "Installing project dependencies..."
npm ci

# Builds armstock-shared first, then the backend
echo "Building armstock-backend..."
npm run build -w armstock-backend

# Starts the app on first run, restarts it after that
echo "Restarting armstock-backend with PM2..."
pm2 startOrRestart ecosystem.config.js
pm2 save
