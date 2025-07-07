#!/bin/bash

# RSA 密钥对生成脚本
# 为 Cloudflare Workers 许可证服务器生成兼容的密钥对

set -e

echo "🔐 生成 RSA 密钥对..."

# 创建 keys 目录
mkdir -p keys

# 生成 2048 位 RSA 私钥
echo "📝 生成 RSA 私钥..."
openssl genrsa -out keys/private.pem 2048

# 从私钥生成公钥
echo "📝 生成 RSA 公钥..."
openssl rsa -in keys/private.pem -pubout -out keys/public.pem

# 转换私钥为 PKCS#8 格式（Web Crypto API 需要）
echo "🔄 转换私钥为 PKCS#8 格式..."
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in keys/private.pem -out keys/private_pkcs8.pem

echo "✅ 密钥对生成完成！"
echo ""
echo "📁 生成的文件："
echo "  - keys/private.pem        (原始私钥)"
echo "  - keys/private_pkcs8.pem  (PKCS#8 格式私钥，用于 Workers)"
echo "  - keys/public.pem         (公钥)"
echo ""
echo "🚀 下一步："
echo "1. 设置私钥环境变量："
echo "   wrangler secret put RSA_PRIVATE_KEY"
echo "   然后粘贴 keys/private_pkcs8.pem 的完整内容"
echo ""
echo "2. 设置公钥环境变量："
echo "   wrangler secret put RSA_PUBLIC_KEY"
echo "   然后粘贴 keys/public.pem 的完整内容"
echo ""
echo "⚠️  安全提醒："
echo "   - 请妥善保管私钥文件"
echo "   - 不要将私钥提交到版本控制系统"
echo "   - 建议在设置完环境变量后删除本地密钥文件"

# 显示密钥内容（方便复制）
echo ""
echo "🔑 私钥内容 (PKCS#8 格式)："
echo "----------------------------------------"
cat keys/private_pkcs8.pem
echo "----------------------------------------"
echo ""
echo "🔑 公钥内容："
echo "----------------------------------------"
cat keys/public.pem
echo "----------------------------------------"