#!/bin/bash

# Cloudflare Pages 部署脚本
# 使用此脚本将项目部署到 Cloudflare Pages

set -e

echo "🚀 开始部署到 Cloudflare Pages..."

# 检查必要的工具
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI 未安装，正在安装..."
    npm install -g wrangler
fi

# 检查登录状态
echo "🔐 检查 Cloudflare 登录状态..."
if ! wrangler whoami &> /dev/null; then
    echo "请先登录 Cloudflare:"
    wrangler login
fi

# 获取账户信息
ACCOUNT_ID=$(wrangler whoami | grep "Account ID" | awk '{print $3}' || echo "")
if [ -z "$ACCOUNT_ID" ]; then
    echo "❌ 无法获取账户 ID，请检查登录状态"
    exit 1
fi

echo "✅ 账户 ID: $ACCOUNT_ID"

# 项目名称
PROJECT_NAME="augment-license-server"

# 检查项目是否存在
echo "📋 检查 Pages 项目..."
if ! wrangler pages project list | grep -q "$PROJECT_NAME"; then
    echo "🆕 创建新的 Pages 项目: $PROJECT_NAME"
    wrangler pages project create "$PROJECT_NAME" --compatibility-date=2024-01-01
else
    echo "✅ Pages 项目已存在: $PROJECT_NAME"
fi

# 创建 D1 数据库（如果不存在）
echo "🗄️ 检查 D1 数据库..."
DB_NAME="augment-licenses"
if ! wrangler d1 list | grep -q "$DB_NAME"; then
    echo "🆕 创建 D1 数据库: $DB_NAME"
    wrangler d1 create "$DB_NAME"
    echo "⚠️  请将返回的 database_id 更新到 wrangler.toml 文件中"
    echo "⚠️  然后重新运行此脚本"
    exit 1
else
    echo "✅ D1 数据库已存在: $DB_NAME"
fi

# 生成 RSA 密钥对（如果不存在）
if [ ! -f "keys/private_pkcs8.pem" ] || [ ! -f "keys/public.pem" ]; then
    echo "🔑 生成 RSA 密钥对..."
    ./scripts/generate-keys.sh
fi

# 设置环境变量
echo "🔧 设置环境变量..."

# 检查并设置私钥
if ! wrangler secret list | grep -q "RSA_PRIVATE_KEY"; then
    echo "设置 RSA 私钥..."
    wrangler secret put RSA_PRIVATE_KEY < keys/private_pkcs8.pem
fi

# 检查并设置公钥
if ! wrangler secret list | grep -q "RSA_PUBLIC_KEY"; then
    echo "设置 RSA 公钥..."
    wrangler secret put RSA_PUBLIC_KEY < keys/public.pem
fi

# 检查并设置管理 API 密钥
if ! wrangler secret list | grep -q "ADMIN_API_KEY"; then
    echo "设置管理 API 密钥..."
    echo "请输入管理 API 密钥（建议使用强密码）:"
    wrangler secret put ADMIN_API_KEY
fi

# 初始化数据库
echo "📊 初始化数据库..."
echo "创建表结构..."
wrangler d1 execute "$DB_NAME" --file=./database/schema.sql

echo "生成预置激活码数据..."
node ./scripts/generate-seed-data.js

echo "插入预置数据..."
wrangler d1 execute "$DB_NAME" --file=./database/seed.sql

# 构建项目
echo "🔨 构建项目..."
npm run build:pages

# 确保 public 目录存在且有内容
if [ ! -d "public" ]; then
    echo "❌ public 目录不存在，创建中..."
    mkdir -p public
fi

if [ ! -f "public/index.html" ]; then
    echo "❌ public/index.html 不存在，请检查构建过程"
    exit 1
fi

echo "✅ 构建完成，开始部署..."

# 部署到 Pages
echo "🚀 部署到 Cloudflare Pages..."
wrangler pages deploy public --project-name="$PROJECT_NAME" --compatibility-date=2024-01-01

# 获取部署 URL
DEPLOY_URL="https://$PROJECT_NAME.pages.dev"
echo ""
echo "🎉 部署完成！"
echo "📱 访问地址: $DEPLOY_URL"
echo ""

# 测试部署
echo "🧪 测试部署..."
echo "健康检查:"
curl -s "$DEPLOY_URL/api/v1/health" | jq . || echo "健康检查失败，请检查部署状态"

echo ""
echo "测试激活码验证:"
curl -s -X POST "$DEPLOY_URL/api/v1/license" \
  -H "Content-Type: application/json" \
  -d '{"key": "ENTERPRISE2024", "id": "test-machine-uuid"}' | jq . || echo "激活码测试失败"

echo ""
echo "✅ 部署脚本执行完成！"
echo ""
echo "📋 后续步骤:"
echo "1. 访问 $DEPLOY_URL 查看服务状态"
echo "2. 在 VS Code 插件中配置新的服务地址"
echo "3. 测试激活码验证功能"
echo ""
echo "🔧 管理命令:"
echo "- 查看日志: wrangler pages deployment tail --project-name=$PROJECT_NAME"
echo "- 查看数据库: wrangler d1 execute $DB_NAME --command='SELECT * FROM license_keys'"
echo "- 更新密钥: wrangler secret put RSA_PRIVATE_KEY"