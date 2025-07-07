-- Augment License Server 数据库架构
-- 适用于 Cloudflare D1 (SQLite)

-- 许可证密钥表
CREATE TABLE IF NOT EXISTS license_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_hash TEXT UNIQUE NOT NULL,           -- 许可证密钥的哈希值
    key_data TEXT NOT NULL,                  -- 加密的许可证数据
    machine_id TEXT,                         -- 绑定的机器UUID
    revoked INTEGER DEFAULT 0,               -- 是否已撤销 (0=有效, 1=已撤销)
    issue_date INTEGER NOT NULL,             -- 发放时间戳
    expire_date INTEGER,                     -- 过期时间戳 (NULL表示永不过期)
    max_machines INTEGER DEFAULT 1,         -- 最大绑定机器数
    product_identity TEXT DEFAULT 'AugmentCode', -- 产品标识
    metadata TEXT,                           -- 额外元数据 (JSON格式)
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 机器绑定记录表
CREATE TABLE IF NOT EXISTS machine_bindings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_hash TEXT NOT NULL,                  -- 关联的许可证密钥哈希
    machine_id TEXT NOT NULL,                -- 机器UUID
    first_bind_date INTEGER NOT NULL,        -- 首次绑定时间
    last_access_date INTEGER,                -- 最后访问时间
    access_count INTEGER DEFAULT 0,          -- 访问次数
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (key_hash) REFERENCES license_keys(key_hash),
    UNIQUE(key_hash, machine_id)
);

-- 访问日志表 (可选，用于审计)
CREATE TABLE IF NOT EXISTS access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_hash TEXT,
    machine_id TEXT,
    action TEXT NOT NULL,                    -- 'validate', 'issue', 'revoke'
    status TEXT NOT NULL,                    -- 'success', 'failed', 'denied'
    ip_address TEXT,
    user_agent TEXT,
    error_message TEXT,
    timestamp INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_license_keys_hash ON license_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_license_keys_machine ON license_keys(machine_id);
CREATE INDEX IF NOT EXISTS idx_license_keys_revoked ON license_keys(revoked);
CREATE INDEX IF NOT EXISTS idx_license_keys_product ON license_keys(product_identity);

CREATE INDEX IF NOT EXISTS idx_machine_bindings_key ON machine_bindings(key_hash);
CREATE INDEX IF NOT EXISTS idx_machine_bindings_machine ON machine_bindings(machine_id);

CREATE INDEX IF NOT EXISTS idx_access_logs_key ON access_logs(key_hash);
CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp);

-- 触发器：自动更新 updated_at 字段
CREATE TRIGGER IF NOT EXISTS update_license_keys_timestamp 
    AFTER UPDATE ON license_keys
BEGIN
    UPDATE license_keys SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;