#!/bin/bash
cd "$(dirname "$0")"

clear
echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║                                      ║"
echo "  ║    AI Article Illustrator · 全文配图生成器        ║"
echo "  ║                                      ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "  ❌ 未检测到 Node.js"
    echo "  请前往 https://nodejs.org/ 安装"
    echo ""
    read -p "  按回车键退出..."
    exit 1
fi

echo "  ✓ Node.js $(node -v)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "  ⏳ 首次运行，正在安装依赖..."
    npm install --silent
    echo "  ✓ 依赖安装完成"
fi

echo ""
echo "  🚀 启动中..."
echo "  打开浏览器访问 → http://localhost:3000"
echo ""
echo "  按 Ctrl+C 停止服务"
echo "  ─────────────────────────────────────"
echo ""

npm run dev
