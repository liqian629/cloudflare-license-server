#!/bin/bash

# Augment License Server 快速部署脚本

set -e

echo "🚀 Augment License Server 部署脚本"
echo "=================================="

# 检查必需的工具
check_requirements() {
    echo "🔍 检查部署环境..."
    
    if ! command -v wrangler &> /dev/null; then
        echo "❌ Wrangler CLI 未安装"
        echo "请运行: npm install -g wrangler"
        exit 1
    fi
    
    if ! command -v openssl &> /dev/null; then
        echo "❌ OpenSSL 未安装"
        echo "请安装 OpenSSL"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js 未安装"
        echo "请安装 Node.js"
        exit 1
    fi
    
    echo "✅ 环境检查通过"
}

# 安装依赖
install_dependencies() {
    echo "📦 安装项目依赖..."
    npm install
    echo "✅ 依赖安装完成"
}

# 生成 RSA 密钥对
generate_keys() {
    echo "🔐 生成 RSA 密钥对..."
    
    if [ -f "keys/private_pkcs8.pem" ] && [ -f "keys/public.pem" ]; then
        echo "⚠️  密钥文件已存在，跳过生成"
        return
    fi
    
    ./scripts/generate-keys.sh
    echo "✅ RSA 密钥对生成完成"
}

# 创建 D1 数据库
create_database() {
    echo "🗄️  创建 D1 数据库..."
    
    # 检查数据库是否已存在
    if wrangler d1 list | grep -q "augment-licenses"; then
        echo "⚠️  数据库 'augment-licenses' 已存在，跳过创建"
        return
    fi
    
    echo "创建新的 D1 数据库..."
    wrangler d1 create augment-licenses
    
    echo ""
    echo "⚠️  重要提醒："
    echo "请将上面输出的 database_id 复制到 wrangler.toml 文件中"
    echo "替换 'your-database-id-here' 为实际的数据库ID"
    echo ""
    read -p "按回车键继续..."
}

# 设置环境变量
setup_secrets() {
    echo "🔑 设置环境变量..."
    
    echo "设置 RSA 私钥..."
    echo "请粘贴 keys/private_pkcs8.pem 的完整内容："
    wrangler secret put RSA_PRIVATE_KEY
    
    echo "设置 RSA 公钥..."
    echo "请粘贴 keys/public.pem 的完整内容："
    wrangler secret put RSA_PUBLIC_KEY
    
    echo "设置管理 API 密钥..."
    echo "请输入一个强密码作为管理 API 密钥："
    wrangler secret put ADMIN_API_KEY
    
    echo "✅ 环境变量设置完成"
}

# 初始化数据库
init_database() {
    echo "🏗️  初始化数据库..."
    
    echo "创建数据库表结构..."
    wrangler d1 execute augment-licenses --file=./database/schema.sql
    
    echo "生成预置激活码数据..."
    node ./scripts/generate-seed-data.js
    
    echo "插入预置数据..."
    wrangler d1 execute augment-licenses --file=./database/seed.sql
    
    echo "✅ 数据库初始化完成"
}

# 部署到 Cloudflare Workers
deploy_worker() {
    echo "🌐 部署到 Cloudflare Workers..."
    
    wrangler deploy
    
    echo "✅ 部署完成"
}

# 测试部署
test_deployment() {
    echo "🧪 测试部署..."
    
    # 获取 Worker URL
    WORKER_URL=$(wrangler whoami 2>/dev/null | grep "Account ID" | awk '{print $3}')
    if [ -z "$WORKER_URL" ]; then
        echo "⚠️  无法自动获取 Worker URL，请手动测试"
        echo "测试 URL: https://augment-license-server.your-subdomain.workers.dev"
        return
    fi
    
    echo "测试健康检查..."
    curl -s "https://augment-license-server.${WORKER_URL}.workers.dev/v1/health" | jq .
    
    echo "测试激活码验证..."
    curl -s -X POST "https://augment-license-server.${WORKER_URL}.workers.dev/v1/license" \
        -H "Content-Type: application/json" \
        -d '{"key": "ENTERPRISE2024", "id": "test-machine-uuid"}' | jq .
    
    echo "✅ 测试完成"
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "🎉 部署完成！"
    echo "=============="
    echo ""
    echo "📡 API 端点："
    echo "  - POST /v1/license - 许可证验证"
    echo "  - POST /v1/admin/issue - 发放许可证（需要 API 密钥）"
    echo "  - POST /v1/admin/revoke - 撤销许可证（需要 API 密钥）"
    echo "  - GET /v1/health - 健康检查"
    echo ""
    echo "🔑 预置激活码："
    echo "  - ENTERPRISE2024 (企业版，最多5台机器)"
    echo "  - AUGMENT_PRO (专业版，最多3台机器)"
    echo "  - COMPANY_LICENSE (公司版，最多10台机器)"
    echo ""
    echo "📚 更多信息请查看 README.md"
    echo ""
    echo "⚠️  安全提醒："
    echo "  - 请妥善保管 RSA 私钥和管理 API 密钥"
    echo "  - 建议删除本地的 keys/ 目录"
    echo "  - 定期轮换 API 密钥"
}

# 主函数
main() {
    echo "开始部署流程..."
    echo ""
    
    check_requirements
    install_dependencies
    generate_keys
    create_database
    setup_secrets
    init_database
    deploy_worker
    test_deployment
    show_deployment_info
    
    echo ""
    echo "🎊 部署流程完成！"
}

# 运行主函数
main "$@"