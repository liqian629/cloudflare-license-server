/**
 * 数据库操作工具模块
 * 适配 Cloudflare D1 数据库
 */

import { ErrorCodes } from '../errors.js';

/**
 * 数据库操作类
 */
export class DatabaseManager {
    constructor(db) {
        this.db = db;
    }

    /**
     * 根据密钥哈希查找许可证
     */
    async findLicenseByKeyHash(keyHash) {
        try {
            const result = await this.db
                .prepare('SELECT * FROM license_keys WHERE key_hash = ? AND revoked = 0')
                .bind(keyHash)
                .first();
            
            return result;
        } catch (error) {
            console.error('Database error in findLicenseByKeyHash:', error);
            throw new Error('Database query failed');
        }
    }

    /**
     * 创建新的许可证记录
     */
    async createLicense(licenseData) {
        try {
            const {
                keyHash,
                keyData,
                machineId = null,
                issueDate,
                expireDate = null,
                maxMachines = 1,
                productIdentity = 'AugmentCode',
                metadata = null
            } = licenseData;

            const result = await this.db
                .prepare(`
                    INSERT INTO license_keys 
                    (key_hash, key_data, machine_id, issue_date, expire_date, max_machines, product_identity, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `)
                .bind(keyHash, keyData, machineId, issueDate, expireDate, maxMachines, productIdentity, metadata)
                .run();

            return result.success;
        } catch (error) {
            console.error('Database error in createLicense:', error);
            if (error.message.includes('UNIQUE constraint failed')) {
                throw new Error('License key already exists');
            }
            throw new Error('Failed to create license');
        }
    }    /**
     * 绑定机器到许可证
     */
    async bindMachineToLicense(keyHash, machineId) {
        try {
            // 检查是否已经绑定
            const existingBinding = await this.db
                .prepare('SELECT * FROM machine_bindings WHERE key_hash = ? AND machine_id = ?')
                .bind(keyHash, machineId)
                .first();

            if (existingBinding) {
                // 更新最后访问时间和访问次数
                await this.db
                    .prepare(`
                        UPDATE machine_bindings 
                        SET last_access_date = ?, access_count = access_count + 1
                        WHERE key_hash = ? AND machine_id = ?
                    `)
                    .bind(Date.now(), keyHash, machineId)
                    .run();
                
                return true;
            }

            // 检查机器绑定数量限制
            const license = await this.findLicenseByKeyHash(keyHash);
            if (!license) {
                throw new Error('License not found');
            }

            const bindingCount = await this.db
                .prepare('SELECT COUNT(*) as count FROM machine_bindings WHERE key_hash = ?')
                .bind(keyHash)
                .first();

            if (bindingCount.count >= license.max_machines) {
                throw new Error('Machine limit exceeded');
            }

            // 创建新的绑定记录
            const result = await this.db
                .prepare(`
                    INSERT INTO machine_bindings 
                    (key_hash, machine_id, first_bind_date, last_access_date, access_count)
                    VALUES (?, ?, ?, ?, 1)
                `)
                .bind(keyHash, machineId, Date.now(), Date.now())
                .run();

            return result.success;
        } catch (error) {
            console.error('Database error in bindMachineToLicense:', error);
            throw error;
        }
    }    /**
     * 撤销许可证
     */
    async revokeLicense(keyHash) {
        try {
            const result = await this.db
                .prepare('UPDATE license_keys SET revoked = 1 WHERE key_hash = ?')
                .bind(keyHash)
                .run();

            return result.changes > 0;
        } catch (error) {
            console.error('Database error in revokeLicense:', error);
            throw new Error('Failed to revoke license');
        }
    }

    /**
     * 获取许可证的机器绑定信息
     */
    async getLicenseBindings(keyHash) {
        try {
            const result = await this.db
                .prepare('SELECT * FROM machine_bindings WHERE key_hash = ? ORDER BY first_bind_date')
                .bind(keyHash)
                .all();

            return result.results || [];
        } catch (error) {
            console.error('Database error in getLicenseBindings:', error);
            throw new Error('Failed to get license bindings');
        }
    }

    /**
     * 记录访问日志
     */
    async logAccess(logData) {
        try {
            const {
                keyHash,
                machineId,
                action,
                status,
                ipAddress = null,
                userAgent = null,
                errorMessage = null
            } = logData;

            await this.db
                .prepare(`
                    INSERT INTO access_logs 
                    (key_hash, machine_id, action, status, ip_address, user_agent, error_message)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `)
                .bind(keyHash, machineId, action, status, ipAddress, userAgent, errorMessage)
                .run();

            return true;
        } catch (error) {
            console.error('Database error in logAccess:', error);
            // 日志记录失败不应该影响主要功能
            return false;
        }
    }

    /**
     * 清理过期的访问日志（可选的维护操作）
     */
    async cleanupOldLogs(daysToKeep = 90) {
        try {
            const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
            
            const result = await this.db
                .prepare('DELETE FROM access_logs WHERE timestamp < ?')
                .bind(cutoffTime)
                .run();

            return result.changes;
        } catch (error) {
            console.error('Database error in cleanupOldLogs:', error);
            return 0;
        }
    }
}