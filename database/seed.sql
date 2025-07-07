-- Augment License Server 初始数据
-- 预置企业激活码

-- 注意：这里的 key_hash 和 key_data 需要在部署时根据实际的 RSA 密钥生成
-- 以下是示例数据，实际部署时需要替换

-- 企业激活码 1: ENTERPRISE2024
INSERT OR IGNORE INTO license_keys (
    key_hash, 
    key_data, 
    revoked, 
    issue_date, 
    expire_date, 
    max_machines, 
    product_identity,
    metadata
) VALUES (
    'enterprise2024_hash',  -- 需要替换为实际哈希值
    'enterprise2024_data',  -- 需要替换为实际加密数据
    0,
    strftime('%s', 'now'),
    NULL,  -- 永不过期
    5,     -- 最多绑定5台机器
    'AugmentCode',
    '{"type": "enterprise", "name": "Enterprise 2024", "features": ["full_access"]}'
);

-- 企业激活码 2: AUGMENT_PRO  
INSERT OR IGNORE INTO license_keys (
    key_hash,
    key_data,
    revoked,
    issue_date,
    expire_date,
    max_machines,
    product_identity,
    metadata
) VALUES (
    'augment_pro_hash',     -- 需要替换为实际哈希值
    'augment_pro_data',     -- 需要替换为实际加密数据
    0,
    strftime('%s', 'now'),
    NULL,  -- 永不过期
    3,     -- 最多绑定3台机器
    'AugmentCode',
    '{"type": "professional", "name": "Augment Pro", "features": ["advanced_features"]}'
);

-- 企业激活码 3: COMPANY_LICENSE
INSERT OR IGNORE INTO license_keys (
    key_hash,
    key_data,
    revoked,
    issue_date,
    expire_date,
    max_machines,
    product_identity,
    metadata
) VALUES (
    'company_license_hash', -- 需要替换为实际哈希值
    'company_license_data', -- 需要替换为实际加密数据
    0,
    strftime('%s', 'now'),
    NULL,  -- 永不过期
    10,    -- 最多绑定10台机器
    'AugmentCode',
    '{"type": "company", "name": "Company License", "features": ["enterprise_features", "priority_support"]}'
);