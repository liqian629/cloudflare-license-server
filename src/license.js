/**
 * 许可证核心逻辑模块
 * 移植自原项目的 model.js，适配 Cloudflare Workers
 */

import { importPrivateKey, importPublicKey, encryptData, decryptData, generateHash } from './utils/crypto.js';
import { DatabaseManager } from './utils/database.js';
import { ErrorCodes } from './errors.js';
import { attrsNotNull, validateMachineId, validateLicenseKey } from './utils/validation.js';

export class LicenseManager {
    constructor(config) {
        this.config = config;
        this.db = new DatabaseManager(config.database);
        this.privateKey = null;
        this.publicKey = null;
    }

    /**
     * 初始化 RSA 密钥
     */
    async initialize() {
        try {
            this.config.validate();
            
            this.privateKey = await importPrivateKey(
                this.config.rsaPrivateKey, 
                this.config.rsaAlgorithm
            );
            
            this.publicKey = await importPublicKey(
                this.config.rsaPublicKey, 
                this.config.rsaAlgorithm
            );
            
            console.log('License manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize license manager:', error);
            throw error;
        }
    }

    /**
     * 验证许可证密钥并授权机器
     * 兼容原项目的 API 接口
     */
    async validateLicense(requestData) {
        try {
            // 验证输入参数
            if (!attrsNotNull(requestData, ['key', 'id'])) {
                return {
                    status: ErrorCodes.INVALID_INPUT,
                    message: 'Missing required parameters: key and id'
                };
            }

            const { key, id: machineId } = requestData;

            // 验证参数格式
            if (!validateLicenseKey(key)) {
                await this.db.logAccess({
                    keyHash: key,
                    machineId,
                    action: 'validate',
                    status: 'failed',
                    errorMessage: 'Invalid license key format'
                });
                
                return {
                    status: ErrorCodes.INVALID_LICENSE_KEY,
                    message: 'Invalid license key format'
                };
            }

            if (!validateMachineId(machineId)) {
                await this.db.logAccess({
                    keyHash: key,
                    machineId,
                    action: 'validate',
                    status: 'failed',
                    errorMessage: 'Invalid machine ID format'
                });
                
                return {
                    status: ErrorCodes.INVALID_INPUT,
                    message: 'Invalid machine ID format'
                };
            }

            // 生成密钥哈希
            const keyHash = await generateHash(key);

            // 查找许可证记录
            const license = await this.db.findLicenseByKeyHash(keyHash);
            if (!license) {
                await this.db.logAccess({
                    keyHash,
                    machineId,
                    action: 'validate',
                    status: 'failed',
                    errorMessage: 'License not found'
                });
                
                return {
                    status: ErrorCodes.INVALID_LICENSE_KEY,
                    message: 'License not found'
                };
            }

            // 检查许可证状态
            if (license.revoked) {
                await this.db.logAccess({
                    keyHash,
                    machineId,
                    action: 'validate',
                    status: 'denied',
                    errorMessage: 'License revoked'
                });
                
                return {
                    status: ErrorCodes.LICENSE_REVOKED,
                    message: 'License has been revoked'
                };
            }

            // 检查过期时间
            if (license.expire_date && license.expire_date < Date.now()) {
                await this.db.logAccess({
                    keyHash,
                    machineId,
                    action: 'validate',
                    status: 'denied',
                    errorMessage: 'License expired'
                });
                
                return {
                    status: ErrorCodes.LICENSE_EXPIRED,
                    message: 'License has expired'
                };
            }

            // 尝试绑定机器
            try {
                await this.db.bindMachineToLicense(keyHash, machineId);
            } catch (error) {
                if (error.message.includes('Machine limit exceeded')) {
                    await this.db.logAccess({
                        keyHash,
                        machineId,
                        action: 'validate',
                        status: 'denied',
                        errorMessage: 'Machine limit exceeded'
                    });
                    
                    return {
                        status: ErrorCodes.MACHINE_LIMIT_EXCEEDED,
                        message: 'Maximum number of machines exceeded for this license'
                    };
                }
                throw error;
            }

            // 生成许可证文件
            const licenseFile = await this.generateLicenseFile(license, machineId);

            // 记录成功访问
            await this.db.logAccess({
                keyHash,
                machineId,
                action: 'validate',
                status: 'success'
            });

            return {
                status: ErrorCodes.SUCCESS,
                message: 'License validated successfully',
                license: licenseFile
            };

        } catch (error) {
            console.error('Error in validateLicense:', error);
            
            // 记录错误日志
            if (requestData?.key && requestData?.id) {
                const keyHash = await generateHash(requestData.key);
                await this.db.logAccess({
                    keyHash,
                    machineId: requestData.id,
                    action: 'validate',
                    status: 'failed',
                    errorMessage: error.message
                });
            }
            
            return {
                status: ErrorCodes.SERVER_ERROR,
                message: 'Internal server error'
            };
        }
    }    /**
     * 生成许可证文件
     */
    async generateLicenseFile(license, machineId) {
        try {
            const licenseData = {
                identity: license.product_identity || this.config.identity,
                machineId: machineId,
                issueDate: license.issue_date,
                expireDate: license.expire_date,
                metadata: license.metadata ? JSON.parse(license.metadata) : {},
                timestamp: Date.now()
            };

            // 将许可证数据序列化为JSON
            const licenseJson = JSON.stringify(licenseData);
            
            // 使用私钥加密许可证数据
            const encryptedData = await encryptData(
                this.privateKey, 
                licenseJson,
                this.config.encryptionLimits.maxEncryptSize
            );

            // 转换为Base64字符串
            const licenseFile = btoa(String.fromCharCode(...new Uint8Array(encryptedData)));
            
            return licenseFile;
        } catch (error) {
            console.error('Error generating license file:', error);
            throw new Error('Failed to generate license file');
        }
    }

    /**
     * 发放新的许可证（管理接口）
     */
    async issueLicense(requestData) {
        try {
            // 验证输入参数
            if (!attrsNotNull(requestData, ['key', 'identity'])) {
                return {
                    status: ErrorCodes.INVALID_INPUT,
                    message: 'Missing required parameters: key and identity'
                };
            }

            const {
                key,
                identity = this.config.identity,
                expireAfter = this.config.expireAfter,
                maxMachines = 1,
                metadata = {}
            } = requestData;

            // 验证密钥格式
            if (!validateLicenseKey(key)) {
                return {
                    status: ErrorCodes.INVALID_LICENSE_KEY,
                    message: 'Invalid license key format'
                };
            }

            // 生成密钥哈希
            const keyHash = await generateHash(key);

            // 检查是否已存在
            const existingLicense = await this.db.findLicenseByKeyHash(keyHash);
            if (existingLicense) {
                return {
                    status: ErrorCodes.DUPLICATE_DATA,
                    message: 'License key already exists'
                };
            }

            // 计算过期时间
            const issueDate = Date.now();
            const expireDate = expireAfter > 0 ? issueDate + expireAfter : null;

            // 创建许可证数据
            const licenseData = {
                identity,
                issueDate,
                expireDate,
                metadata
            };

            // 加密许可证数据
            const encryptedData = await encryptData(
                this.privateKey,
                JSON.stringify(licenseData),
                this.config.encryptionLimits.maxEncryptSize
            );

            const keyData = btoa(String.fromCharCode(...new Uint8Array(encryptedData)));

            // 保存到数据库
            const success = await this.db.createLicense({
                keyHash,
                keyData,
                issueDate,
                expireDate,
                maxMachines,
                productIdentity: identity,
                metadata: JSON.stringify(metadata)
            });

            if (!success) {
                return {
                    status: ErrorCodes.SERVER_ERROR,
                    message: 'Failed to create license'
                };
            }

            // 记录操作日志
            await this.db.logAccess({
                keyHash,
                machineId: null,
                action: 'issue',
                status: 'success'
            });

            return {
                status: ErrorCodes.SUCCESS,
                message: 'License issued successfully',
                data: {
                    keyHash,
                    issueDate,
                    expireDate,
                    maxMachines
                }
            };

        } catch (error) {
            console.error('Error in issueLicense:', error);
            return {
                status: ErrorCodes.SERVER_ERROR,
                message: 'Internal server error'
            };
        }
    }

    /**
     * 撤销许可证（管理接口）
     */
    async revokeLicense(requestData) {
        try {
            // 验证输入参数
            if (!attrsNotNull(requestData, ['key'])) {
                return {
                    status: ErrorCodes.INVALID_INPUT,
                    message: 'Missing required parameter: key'
                };
            }

            const { key } = requestData;

            // 验证密钥格式
            if (!validateLicenseKey(key)) {
                return {
                    status: ErrorCodes.INVALID_LICENSE_KEY,
                    message: 'Invalid license key format'
                };
            }

            // 生成密钥哈希
            const keyHash = await generateHash(key);

            // 检查许可证是否存在
            const license = await this.db.findLicenseByKeyHash(keyHash);
            if (!license) {
                return {
                    status: ErrorCodes.INVALID_LICENSE_KEY,
                    message: 'License not found'
                };
            }

            // 撤销许可证
            const success = await this.db.revokeLicense(keyHash);
            if (!success) {
                return {
                    status: ErrorCodes.SERVER_ERROR,
                    message: 'Failed to revoke license'
                };
            }

            // 记录操作日志
            await this.db.logAccess({
                keyHash,
                machineId: null,
                action: 'revoke',
                status: 'success'
            });

            return {
                status: ErrorCodes.SUCCESS,
                message: 'License revoked successfully'
            };

        } catch (error) {
            console.error('Error in revokeLicense:', error);
            return {
                status: ErrorCodes.SERVER_ERROR,
                message: 'Internal server error'
            };
        }
    }
}