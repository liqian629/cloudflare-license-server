# Cloudflare Pages 部署指南

## 🚀 快速部署

### 方法一：自动化脚本（推荐）

```bash
# 确保已登录 Cloudflare
wrangler login

# 一键部署
./scripts/deploy-pages.sh
```

### 方法二：手动部署

```bash
# 1. 创建 Pages 项目
wrangler pages project create augment-license-server --compatibility-date=2024-01-01

# 2. 创建 D1 数据库
wrangler d1 create augment-licenses
# 记录返回的 database_id，更新 .wrangler-pages.toml 中的 database_id

# 3. 设置环境变量
wrangler secret put RSA_PRIVATE_KEY
wrangler secret put RSA_PUBLIC_KEY
wrangler secret put ADMIN_API_KEY

# 4. 初始化数据库
wrangler d1 execute augment-licenses --file=./database/schema.sql
node ./scripts/generate-seed-data.js
wrangler d1 execute augment-licenses --file=./database/seed.sql

# 5. 部署
npm run build:pages
wrangler pages deploy public --project-name=augment-license-server --compatibility-date=2024-01-01
```

### 方法三：GitHub Pages 集成

1. 在 Cloudflare Dashboard 中连接 GitHub 仓库
2. 配置构建设置：
   - **Build command**: `npm run build:pages`
   - **Build output directory**: `public`
3. 设置环境变量和 D1 数据库绑定

## 📁 配置文件说明

- `wrangler.toml` - Workers 专用配置
- `.wrangler-pages.toml` - Pages 专用配置
- `pages.toml` - 备用 Pages 配置

## 🔑 环境变量

需要设置以下环境变量：

| 变量名 | 说明 |
|--------|------|
| `RSA_PRIVATE_KEY` | RSA 私钥（PKCS#8 格式） |
| `RSA_PUBLIC_KEY` | RSA 公钥 |
| `ADMIN_API_KEY` | 管理员 API 密钥 |

## 🗄️ D1 数据库配置

需要创建 D1 数据库并更新配置文件中的 `database_id`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "augment-licenses"
database_id = "your-actual-database-id-here"
```

## 🧪 测试部署

部署完成后，访问：
- Web 界面：`https://augment-license-server.pages.dev`
- API 健康检查：`https://augment-license-server.pages.dev/api/v1/health`

## 🔧 故障排除

### 常见问题

1. **配置文件冲突**：确保使用正确的配置文件
   - Workers 部署：使用 `wrangler.toml`
   - Pages 部署：使用 `.wrangler-pages.toml`

2. **数据库 ID 错误**：确保在配置文件中更新了正确的 `database_id`

3. **环境变量未设置**：确保所有必需的环境变量都已正确设置

### 查看日志

```bash
# 查看 Pages 部署日志
wrangler pages deployment tail --project-name=augment-license-server

# 查看数据库内容
wrangler d1 execute augment-licenses --command="SELECT * FROM license_keys LIMIT 5"
```