# Cloudflare Pages 部署指南（无配置文件版本）

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
# 记录返回的 database_id，稍后在 Dashboard 中绑定

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

### 方法三：GitHub Pages 集成（推荐用于生产环境）

1. **在 Cloudflare Dashboard 中连接 GitHub 仓库**
   - 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 点击 "Pages" → "Create a project" → "Connect to Git"
   - 选择仓库：`liqian629/cloudflare-license-server`

2. **配置构建设置**：
   - **Framework preset**: None
   - **Build command**: `npm run build:pages`
   - **Build output directory**: `public`
   - **Root directory**: `/`

3. **设置环境变量**（在 Pages 项目设置中）：
   - `RSA_PRIVATE_KEY`: 您的 RSA 私钥
   - `RSA_PUBLIC_KEY`: 您的 RSA 公钥
   - `ADMIN_API_KEY`: 您的管理员密钥

4. **绑定 D1 数据库**（在 Pages 项目设置的 Functions 标签页中）：
   - Variable name: `DB`
   - D1 database: 选择您创建的 `augment-licenses` 数据库

## 📁 项目结构（无配置文件）

```
cloudflare-license-server/
├── functions/           # Pages Functions (API 路由)
├── public/             # 静态文件 (Web 界面)
├── src/                # 共享代码
├── database/           # 数据库脚本
├── scripts/            # 部署脚本
└── _routes.json        # 路由配置
```

**优势**：
- ✅ 无配置文件冲突
- ✅ 通过 Dashboard 直接管理
- ✅ 更简单的部署流程

## 🔑 环境变量

需要设置以下环境变量：

| 变量名 | 说明 |
|--------|------|
| `RSA_PRIVATE_KEY` | RSA 私钥（PKCS#8 格式） |
| `RSA_PUBLIC_KEY` | RSA 公钥 |
| `ADMIN_API_KEY` | 管理员 API 密钥 |

## 🗄️ D1 数据库配置

### 创建数据库

```bash
# 创建 D1 数据库
wrangler d1 create augment-licenses

# 初始化数据库结构
wrangler d1 execute augment-licenses --file=./database/schema.sql

# 生成并导入种子数据
node ./scripts/generate-seed-data.js
wrangler d1 execute augment-licenses --file=./database/seed.sql
```

### 在 Dashboard 中绑定

1. 进入您的 Pages 项目设置
2. 点击 "Functions" 标签页
3. 在 "D1 database bindings" 部分添加：
   - **Variable name**: `DB`
   - **D1 database**: 选择 `augment-licenses`

## 🧪 测试部署

部署完成后，访问：
- Web 界面：`https://augment-license-server.pages.dev`
- API 健康检查：`https://augment-license-server.pages.dev/api/v1/health`

## 🔧 故障排除

### 常见问题

1. **"Output directory not found" 错误**：
   - 确保运行了 `npm run build:pages`
   - 检查 `public` 目录是否存在且包含 `index.html`

2. **环境变量未设置**：
   - 在 Cloudflare Dashboard 的 Pages 项目设置中添加环境变量
   - 或使用 `wrangler secret put` 命令设置

3. **D1 数据库连接失败**：
   - 确保在 Pages 项目中正确绑定了 D1 数据库
   - 检查数据库名称是否为 `augment-licenses`
   - 确保变量名为 `DB`

### 查看日志

```bash
# 查看 Pages 部署日志
wrangler pages deployment tail --project-name=augment-license-server

# 查看数据库内容
wrangler d1 execute augment-licenses --command="SELECT * FROM license_keys LIMIT 5"
```