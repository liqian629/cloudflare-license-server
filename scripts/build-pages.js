#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔨 Building for Cloudflare Pages...');

// 确保 public 目录存在
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
    console.log('📁 Creating public directory...');
    fs.mkdirSync(publicDir, { recursive: true });
}

// 确保 index.html 存在
const indexPath = path.join(publicDir, 'index.html');
if (!fs.existsSync(indexPath)) {
    console.log('📄 Creating index.html...');
    const indexContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Augment License Server</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; }
        .status { padding: 15px; margin: 20px 0; border-radius: 5px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .api-list { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .endpoint { margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #007bff; }
        .method { font-weight: bold; color: #007bff; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 Augment License Server</h1>
        <div class="status success">
            ✅ 服务运行正常
        </div>
        
        <div class="api-list">
            <h3>📡 API 端点</h3>
            <div class="endpoint">
                <span class="method">GET</span> /api/v1/health - 健康检查
            </div>
            <div class="endpoint">
                <span class="method">POST</span> /api/v1/license - 验证许可证
            </div>
            <div class="endpoint">
                <span class="method">POST</span> /api/v1/admin/issue - 发放许可证
            </div>
            <div class="endpoint">
                <span class="method">POST</span> /api/v1/admin/revoke - 撤销许可证
            </div>
        </div>
        
        <p style="text-align: center; color: #666; margin-top: 30px;">
            Powered by Cloudflare Pages & D1
        </p>
    </div>
</body>
</html>`;
    fs.writeFileSync(indexPath, indexContent);
}

// 检查文件
const files = fs.readdirSync(publicDir);
console.log('📂 Public directory contents:', files);

console.log('✅ Build completed successfully!');
console.log(`📁 Public directory: ${publicDir}`);
console.log(`📄 Files: ${files.join(', ')}`);
