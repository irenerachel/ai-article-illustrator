#!/bin/bash
echo "================================"
echo "  AI Article Illustrator - 全文配图生成器"
echo "================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed."
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "Node.js version: $(node -v)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "Installing dependencies..."
    npm install
fi

echo ""
echo "Starting AI Article Illustrator..."
echo "Open http://localhost:3000 in your browser"
echo ""

npm run dev
