#!/bin/bash
# Starts the frontend only.

cd "$(dirname "$0")" || exit 1

# Load NVM if it exists
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Ensure Node 22 is used
if command -v nvm &> /dev/null; then
    nvm use 22 || nvm install 22
else
    echo "NVM not found. Please ensure Node.js 22 is installed."
fi

# Install dependencies if missing
if [ ! -d "node_modules" ]; then
    echo "Installing project dependencies..."
    npm install
fi

npm run dev:frontend
