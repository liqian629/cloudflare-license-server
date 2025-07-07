/**
 * 配置管理模块
 * 适配 Cloudflare Workers 环境变量
 */

export class Config {
    constructor(env) {
        this.env = env;
    }

    get name() {
        return 'augment-license-server';
    }

    get identity() {
        return this.env.LICENSE_IDENTITY || 'AugmentCode';
    }

    get environment() {
        return this.env.ENVIRONMENT || 'development';
    }

    get expireAfter() {
        return parseInt(this.env.EXPIRE_AFTER) || 365 * 24 * 60 * 60 * 1000; // 1年
    }

    get rsaPrivateKey() {
        return this.env.RSA_PRIVATE_KEY;
    }

    get rsaPublicKey() {
        return this.env.RSA_PUBLIC_KEY;
    }

    get adminApiKey() {
        return this.env.ADMIN_API_KEY;
    }

    get database() {
        return this.env.DB;
    }

    // 验证必需的环境变量
    validate() {
        const required = ['RSA_PRIVATE_KEY', 'RSA_PUBLIC_KEY'];
        const missing = required.filter(key => !this.env[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }

    // 获取 RSA 算法配置
    get rsaAlgorithm() {
        return {
            name: 'RSA-OAEP',
            hash: 'SHA-256'
        };
    }

    // 获取加密块大小限制
    get encryptionLimits() {
        return {
            maxEncryptSize: 86,   // 加密时的最大块大小
            maxDecryptSize: 128   // 解密时的最大块大小
        };
    }
}