#!/usr/bin/env node

/**
 * 生成预置激活码的数据库种子文件
 * 需要先生成 RSA 密钥对
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 企业激活码列表
const ACTIVATION_CODES = [
    'ENTERPRISE2024',
    'AUGMENT_PRO', 
    'COMPANY_LICENSE'
];

// 许可证配置
const LICENSE_CONFIG = {
    'ENTERPRISE2024': {
        maxMachines: 5,
        type: 'enterprise',
        name: 'Enterprise 2024',
        features: ['full_access', 'priority_support']
    },
    'AUGMENT_PRO': {
        maxMachines: 3,
        type: 'professional', 
        name: 'Augment Pro',
        features: ['advanced_features']
    },
    'COMPANY_LICENSE': {
        maxMachines: 10,
        type: 'company',
        name: 'Company License', 
        features: ['enterprise_features', 'priority_support', 'custom_branding']
    }
};

/**
 * 生成数据的 SHA-256 哈希值
 */
function generateHash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * 使用 RSA 私钥加密数据
 */
function encryptData(privateKey, data) {
    const maxChunkSize = 86; // RSA-2048 的最大加密块大小
    const dataBuffer = Buffer.from(data, 'utf8');
    const chunks = [];
    
    let offset = 0;
    while (offset < dataBuffer.length) {
        const chunkSize = Math.min(maxChunkSize, dataBuffer.length - offset);
        const chunk = dataBuffer.slice(offset, offset + chunkSize);
        
        const encryptedChunk = crypto.privateEncrypt(privateKey, chunk);
        chunks.push(encryptedChunk);
        
        offset += chunkSize;
    }
    
    return Buffer.concat(chunks).toString('base64');
}

/**
 * 生成许可证数据
 */
function generateLicenseData(activationCode, config) {
    const now = Date.now();
    
    return {
        identity: 'AugmentCode',
        issueDate: now,
        expireDate: null, // 永不过期
        metadata: {
            type: config.type,
            name: config.name,
            features: config.features,
            activationCode: activationCode
        }
    };
}

/**
 * 主函数
 */
async function main() {
    try {
        console.log('🔐 生成预置激活码数据...');
        
        // 检查密钥文件是否存在
        const privateKeyPath = path.join(__dirname, '../keys/private.pem');
        if (!fs.existsSync(privateKeyPath)) {
            console.error('❌ 私钥文件不存在，请先运行 ./scripts/generate-keys.sh');
            process.exit(1);
        }
        
        // 读取私钥
        const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
        
        // 生成 SQL 插入语句
        const sqlStatements = [];
        
        for (const activationCode of ACTIVATION_CODES) {
            const config = LICENSE_CONFIG[activationCode];
            const keyHash = generateHash(activationCode);
            
            // 生成许可证数据
            const licenseData = generateLicenseData(activationCode, config);
            const licenseJson = JSON.stringify(licenseData);
            
            // 加密许可证数据
            const encryptedData = encryptData(privateKey, licenseJson);
            
            // 生成 SQL 语句
            const sql = `INSERT OR IGNORE INTO license_keys (
    key_hash, 
    key_data, 
    revoked, 
    issue_date, 
    expire_date, 
    max_machines, 
    product_identity,
    metadata
) VALUES (
    '${keyHash}',
    '${encryptedData}',
    0,
    ${licenseData.issueDate},
    NULL,
    ${config.maxMachines},
    'AugmentCode',
    '${JSON.stringify(licenseData.metadata).replace(/'/g, "''")}'
);`;
            
            sqlStatements.push(sql);
            
            console.log(`✅ 生成激活码: ${activationCode}`);
            console.log(`   哈希值: ${keyHash}`);
            console.log(`   最大机器数: ${config.maxMachines}`);
            console.log(`   类型: ${config.type}`);
            console.log('');
        }
        
        // 写入 SQL 文件
        const sqlContent = `-- Augment License Server 预置激活码数据
-- 自动生成于 ${new Date().toISOString()}
-- 
-- 激活码列表:
${ACTIVATION_CODES.map(code => `--   - ${code} (${LICENSE_CONFIG[code].type})`).join('\n')}

${sqlStatements.join('\n\n')}`;
        
        const outputPath = path.join(__dirname, '../database/seed.sql');
        fs.writeFileSync(outputPath, sqlContent);
        
        console.log(`📄 生成的 SQL 文件: ${outputPath}`);
        console.log('');
        console.log('🚀 下一步:');
        console.log('1. 部署数据库架构: wrangler d1 execute augment-licenses --file=./database/schema.sql');
        console.log('2. 插入预置数据: wrangler d1 execute augment-licenses --file=./database/seed.sql');
        console.log('');
        console.log('🔑 激活码验证测试:');
        ACTIVATION_CODES.forEach(code => {
            console.log(`curl -X POST https://your-worker.workers.dev/v1/license \\`);
            console.log(`  -H "Content-Type: application/json" \\`);
            console.log(`  -d '{"key": "${code}", "id": "test-machine-uuid"}'`);
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ 生成失败:', error.message);
        process.exit(1);
    }
}

// 运行主函数
if (require.main === module) {
    main();
}