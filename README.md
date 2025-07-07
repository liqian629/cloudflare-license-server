# Augment License Server - Cloudflare Workers 版本

基于 [devfans/node-license-server](https://github.com/devfans/node-license-server) 改造的 Cloudflare Workers 许可证服务器，专为 Augment VS Code 插件的企业激活码验证而设计。

## 🚀 功能特性

- **RSA 加密**: 使用 Web Crypto API 实现 RSA 加密/解密
- **机器绑定**: 支持许可证与机器UUID绑定，防止滥用
- **多机器支持**: 可配置每个许可证的最大绑定机器数
- **许可证管理**: 支持许可证发放、验证、撤销
- **访问日志**: 完整的访问和操作审计日志
- **边缘计算**: 利用 Cloudflare 全球边缘网络，低延迟响应
- **无服务器**: 零运维，按需付费

## 📋 技术架构

### 原项目 vs Cloudflare 版本

| 组件 | 原项目 | Cloudflare 版本 |
|------|--------|----------------|
| 运行时 | Node.js + Express | Cloudflare Workers |
| 数据库 | Redis | Cloudflare D1 (SQLite) |
| 加密 | Node.js crypto | Web Crypto API |
| 配置 | 文件系统 | 环境变量 |
| 部署 | 传统服务器 | 边缘计算 |

### API 兼容性

保持与原项目完全兼容的 API 接口：

- `POST /v1/license` - 许可证验证（与 VS Code 插件集成）
- `POST /v1/admin/issue` - 发放许可证（管理接口）
- `POST /v1/admin/revoke` - 撤销许可证（管理接口）
- `GET /v1/health` - 健康检查

## 🛠️ 部署指南

### 1. 环境准备

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 克隆项目
cd /path/to/your/project
```

### 2. 创建 D1 数据库

```bash
# 创建数据库
wrangler d1 create augment-licenses

# 记录返回的 database_id，更新 wrangler.toml 中的 database_id
```

### 3. 生成 RSA 密钥对

```bash
# 生成私钥
openssl genrsa -out private.pem 2048

# 生成公钥
openssl rsa -in private.pem -pubout -out public.pem

# 转换为 PKCS#8 格式（Web Crypto API 需要）
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in private.pem -out private_pkcs8.pem
```

### 4. 配置环境变量

```bash
# 设置 RSA 私钥（注意保持格式）
wrangler secret put RSA_PRIVATE_KEY
# 粘贴 private_pkcs8.pem 的完整内容

# 设置 RSA 公钥
wrangler secret put RSA_PUBLIC_KEY  
# 粘贴 public.pem 的完整内容

# 设置管理 API 密钥
wrangler secret put ADMIN_API_KEY
# 输入一个强密码，用于管理接口认证
```

### 5. 初始化数据库

```bash
# 创建表结构
wrangler d1 execute augment-licenses --file=./database/schema.sql

# 插入初始数据（可选）
wrangler d1 execute augment-licenses --file=./database/seed.sql
```

### 6. 部署服务

```bash
# 开发环境测试
npm run dev

# 部署到生产环境
npm run deploy
```

## 🔧 配置说明

### wrangler.toml 配置

```toml
name = "augment-license-server"
main = "src/index.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "augment-licenses"
database_id = "your-database-id-here"  # 替换为实际ID

[vars]
ENVIRONMENT = "production"
LICENSE_IDENTITY = "AugmentCode"
EXPIRE_AFTER = "31536000000"  # 1年，单位毫秒
```

### 环境变量

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `RSA_PRIVATE_KEY` | ✅ | RSA 私钥（PKCS#8 格式） |
| `RSA_PUBLIC_KEY` | ✅ | RSA 公钥（SPKI 格式） |
| `ADMIN_API_KEY` | ❌ | 管理接口 API 密钥 |
| `LICENSE_IDENTITY` | ❌ | 产品标识，默认 "AugmentCode" |
| `EXPIRE_AFTER` | ❌ | 许可证有效期（毫秒），默认1年 |

## 📡 API 使用

### 许可证验证（VS Code 插件使用）

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/v1/license \
  -H "Content-Type: application/json" \
  -d '{
    "key": "ENTERPRISE2024",
    "id": "machine-uuid-here"
  }'
```

响应：
```json
{
  "status": 0,
  "message": "License validated successfully",
  "license": "base64-encoded-license-file",
  "timestamp": 1703123456789
}
```

### 发放许可证（管理接口）

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/v1/admin/issue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-admin-api-key" \
  -d '{
    "key": "NEW_LICENSE_KEY",
    "identity": "AugmentCode",
    "maxMachines": 5,
    "metadata": {
      "type": "enterprise",
      "features": ["full_access"]
    }
  }'
```

### 撤销许可证（管理接口）

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/v1/admin/revoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-admin-api-key" \
  -d '{
    "key": "LICENSE_KEY_TO_REVOKE"
  }'
```

## 🔗 VS Code 插件集成

### 当前集成状态

VS Code 插件已经包含激活码验证逻辑，支持以下激活码：
- `ENTERPRISE2024`
- `AUGMENT_PRO` 
- `COMPANY_LICENSE`

### 集成步骤

1. **更新插件配置**: 将许可证服务器 URL 配置到插件中
2. **修改验证逻辑**: 将硬编码验证改为 API 调用
3. **机器ID生成**: 确保生成唯一且稳定的机器标识
4. **许可证缓存**: 本地缓存许可证文件，减少网络请求

### 建议的插件修改

```javascript
// 替换现有的硬编码验证
async function validateActivationCode(activationCode, machineId) {
    try {
        const response = await fetch('https://your-license-server.workers.dev/v1/license', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: activationCode,
                id: machineId
            })
        });
        
        const result = await response.json();
        
        if (result.status === 0) {
            // 验证成功，保存许可证文件
            await vscode.secrets.store('augment.license', result.license);
            return true;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('License validation failed:', error);
        return false;
    }
}
```

## 🔒 安全考虑

### 密钥管理
- RSA 私钥通过 Cloudflare Secrets 安全存储
- 管理 API 密钥独立配置，支持轮换
- 所有敏感数据加密传输

### 访问控制
- 管理接口需要 API 密钥认证
- 支持 CORS 跨域访问控制
- 详细的访问日志记录

### 数据保护
- 许可证数据 RSA 加密存储
- 机器绑定防止许可证滥用
- 支持许可证撤销和过期控制

## 📊 监控和维护

### 日志查看
```bash
# 查看 Workers 日志
wrangler tail

# 查看数据库内容
wrangler d1 execute augment-licenses --command="SELECT * FROM license_keys LIMIT 10"
```

### 数据库维护
```bash
# 清理过期日志
wrangler d1 execute augment-licenses --command="DELETE FROM access_logs WHERE timestamp < strftime('%s', 'now', '-90 days')"

# 查看许可证使用统计
wrangler d1 execute augment-licenses --command="SELECT product_identity, COUNT(*) as count FROM license_keys WHERE revoked = 0 GROUP BY product_identity"
```

## 🚨 故障排除

### 常见问题

1. **RSA 密钥格式错误**
   - 确保私钥是 PKCS#8 格式
   - 确保公钥是 SPKI 格式
   - 检查密钥内容是否完整（包含头尾）

2. **数据库连接失败**
   - 检查 `wrangler.toml` 中的 `database_id` 是否正确
   - 确保数据库已正确创建和初始化

3. **API 认证失败**
   - 检查 `ADMIN_API_KEY` 是否正确设置
   - 确保请求头格式为 `Authorization: Bearer <key>`

### 调试模式

```bash
# 本地开发模式
wrangler dev --local

# 查看详细日志
wrangler tail --format=pretty
```

## 📈 性能优化

### 缓存策略
- 考虑使用 Cloudflare KV 缓存频繁访问的许可证
- 设置合理的 TTL，平衡性能和实时性

### 数据库优化
- 定期清理过期的访问日志
- 监控数据库大小和查询性能
- 考虑数据分片策略（大规模使用时）

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🙏 致谢

- 基于 [devfans/node-license-server](https://github.com/devfans/node-license-server) 项目
- 感谢 Cloudflare Workers 平台提供的强大基础设施