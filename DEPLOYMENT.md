# Cloudflare Workers 部署指南

本文档详细说明如何将项目部署到 Cloudflare Workers，包括手动部署和 GitHub Actions 自动部署两种方式。

## 🚀 方式一：GitHub Actions 自动部署（推荐）

### 1. 上传代码到 GitHub

```bash
# 如果还没有初始化 git
git init
git add .
git commit -m "Initial commit: Cloudflare Workers license server"

# 添加远程仓库
git remote add origin https://github.com/liqian629/cloudflare-license-server.git
git branch -M main

# 推送代码（需要先配置 GitHub 认证）
git push -u origin main
```

### 2. 配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

#### 必需的 Secrets：

1. **CLOUDFLARE_API_TOKEN**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
   - 点击 "Create Token"
   - 使用 "Custom token" 模板
   - 权限设置：
     - Account: `Cloudflare Workers:Edit`
     - Zone Resources: `Include All zones`
   - 复制生成的 Token

2. **CLOUDFLARE_ACCOUNT_ID**
   - 在 Cloudflare Dashboard 右侧边栏找到 "Account ID"
   - 复制该 ID

#### 在 GitHub 中设置 Secrets：

1. 进入仓库页面
2. 点击 `Settings` → `Secrets and variables` → `Actions`
3. 点击 `New repository secret`
4. 分别添加上述两个 secrets

### 3. 创建 D1 数据库

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 创建 D1 数据库
wrangler d1 create augment-licenses
```

记录返回的 `database_id`，更新 `wrangler.toml` 文件：

```toml
[[d1_databases]]
binding = "DB"
database_name = "augment-licenses"
database_id = "your-actual-database-id-here"  # 替换这里
```

### 4. 生成 RSA 密钥对

```bash
# 运行密钥生成脚本
./scripts/generate-keys.sh

# 设置私钥
wrangler secret put RSA_PRIVATE_KEY
# 粘贴 keys/private_pkcs8.pem 的完整内容

# 设置公钥
wrangler secret put RSA_PUBLIC_KEY
# 粘贴 keys/public.pem 的完整内容

# 设置管理 API 密钥
wrangler secret put ADMIN_API_KEY
# 输入一个强密码
```

### 5. 初始化数据库

```bash
# 创建表结构
wrangler d1 execute augment-licenses --file=./database/schema.sql

# 生成预置激活码数据
node ./scripts/generate-seed-data.js

# 插入预置数据
wrangler d1 execute augment-licenses --file=./database/seed.sql
```

### 6. 提交更新并触发部署

```bash
# 提交 wrangler.toml 的更新
git add wrangler.toml
git commit -m "Update database ID in wrangler.toml"
git push

# GitHub Actions 将自动触发部署
```

## 🛠️ 方式二：手动部署

### 1. 本地环境准备

```bash
# 安装依赖
npm install

# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login
```

### 2. 运行一键部署脚本

```bash
# 运行完整部署脚本
./scripts/deploy.sh
```

这个脚本会自动完成：
- 检查环境依赖
- 生成 RSA 密钥对
- 创建 D1 数据库
- 设置环境变量
- 初始化数据库
- 部署 Worker
- 运行测试

### 3. 手动步骤（如果脚本失败）

```bash
# 1. 生成密钥
./scripts/generate-keys.sh

# 2. 创建数据库
wrangler d1 create augment-licenses

# 3. 更新 wrangler.toml 中的 database_id

# 4. 设置环境变量
wrangler secret put RSA_PRIVATE_KEY
wrangler secret put RSA_PUBLIC_KEY  
wrangler secret put ADMIN_API_KEY

# 5. 初始化数据库
wrangler d1 execute augment-licenses --file=./database/schema.sql
node ./scripts/generate-seed-data.js
wrangler d1 execute augment-licenses --file=./database/seed.sql

# 6. 部署
wrangler deploy
```

## 🔧 配置验证

### 检查部署状态

```bash
# 查看 Worker 状态
wrangler status

# 查看日志
wrangler tail

# 测试健康检查
curl https://your-worker.your-subdomain.workers.dev/v1/health
```

### 测试激活码验证

```bash
# 测试 ENTERPRISE2024
curl -X POST https://your-worker.your-subdomain.workers.dev/v1/license \
  -H "Content-Type: application/json" \
  -d '{"key": "ENTERPRISE2024", "id": "test-machine-uuid"}'

# 测试 AUGMENT_PRO
curl -X POST https://your-worker.your-subdomain.workers.dev/v1/license \
  -H "Content-Type: application/json" \
  -d '{"key": "AUGMENT_PRO", "id": "test-machine-uuid"}'

# 测试 COMPANY_LICENSE
curl -X POST https://your-worker.your-subdomain.workers.dev/v1/license \
  -H "Content-Type: application/json" \
  -d '{"key": "COMPANY_LICENSE", "id": "test-machine-uuid"}'
```

## 📊 监控和维护

### 查看数据库内容

```bash
# 查看许可证列表
wrangler d1 execute augment-licenses --command="SELECT key_hash, product_identity, max_machines, revoked FROM license_keys"

# 查看机器绑定
wrangler d1 execute augment-licenses --command="SELECT * FROM machine_bindings"

# 查看访问日志
wrangler d1 execute augment-licenses --command="SELECT * FROM access_logs ORDER BY timestamp DESC LIMIT 10"
```

### 管理许可证

```bash
# 发放新许可证
curl -X POST https://your-worker.your-subdomain.workers.dev/v1/admin/issue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-admin-api-key" \
  -d '{
    "key": "NEW_LICENSE_KEY",
    "identity": "AugmentCode",
    "maxMachines": 5,
    "metadata": {"type": "enterprise"}
  }'

# 撤销许可证
curl -X POST https://your-worker.your-subdomain.workers.dev/v1/admin/revoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-admin-api-key" \
  -d '{"key": "LICENSE_KEY_TO_REVOKE"}'
```

## 🚨 故障排除

### 常见问题

1. **GitHub Actions 部署失败**
   - 检查 CLOUDFLARE_API_TOKEN 和 CLOUDFLARE_ACCOUNT_ID 是否正确设置
   - 确保 API Token 有足够的权限

2. **数据库连接错误**
   - 检查 wrangler.toml 中的 database_id 是否正确
   - 确保数据库已创建并初始化

3. **RSA 密钥错误**
   - 确保私钥是 PKCS#8 格式
   - 确保公钥是 SPKI 格式
   - 检查密钥内容是否完整

4. **激活码验证失败**
   - 检查数据库中是否有预置数据
   - 验证 RSA 密钥是否正确设置
   - 查看 Worker 日志排查错误

### 调试命令

```bash
# 查看 Worker 日志
wrangler tail --format=pretty

# 本地开发模式
wrangler dev --local

# 查看环境变量（不会显示 secret 值）
wrangler secret list
```

## 🔒 安全建议

1. **定期轮换密钥**
   - 定期更新 ADMIN_API_KEY
   - 考虑定期轮换 RSA 密钥对

2. **监控访问日志**
   - 定期检查异常访问模式
   - 设置访问频率限制

3. **备份重要数据**
   - 定期备份 D1 数据库
   - 安全存储 RSA 私钥

4. **环境隔离**
   - 生产环境和测试环境使用不同的密钥
   - 限制管理 API 的访问来源

## 📞 支持

如果遇到问题，请：

1. 查看 [README.md](./README.md) 中的详细文档
2. 检查 Worker 日志：`wrangler tail`
3. 验证配置：`wrangler status`
4. 在 GitHub Issues 中报告问题