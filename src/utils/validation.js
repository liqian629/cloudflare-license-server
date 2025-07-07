/**
 * 输入验证工具模块
 */

/**
 * 检查对象是否包含指定的非空属性
 */
export function attrsNotNull(obj, attrs) {
    if (!obj || typeof obj !== 'object') {
        return false;
    }
    
    for (const attr of attrs) {
        if (obj[attr] == null || obj[attr] === '') {
            console.error(`Found null or empty attribute: ${attr}`);
            return false;
        }
    }
    
    return true;
}

/**
 * 检查对象是否包含指定的属性（可以为空）
 */
export function attrsExist(obj, attrs) {
    if (!obj || typeof obj !== 'object') {
        return false;
    }
    
    for (const attr of attrs) {
        if (!obj.hasOwnProperty(attr)) {
            return false;
        }
    }
    
    return true;
}

/**
 * 从对象中提取指定的属性
 */
export function collectAttrs(obj, attrs) {
    const result = {};
    
    for (const attr of attrs) {
        if (obj.hasOwnProperty(attr)) {
            result[attr] = obj[attr];
        }
    }
    
    return result;
}

/**
 * 验证机器ID格式
 */
export function validateMachineId(machineId) {
    if (!machineId || typeof machineId !== 'string') {
        return false;
    }
    
    // 机器ID应该是32-128个字符的字母数字字符串
    const pattern = /^[a-zA-Z0-9\-_]{8,128}$/;
    return pattern.test(machineId);
}

/**
 * 验证许可证密钥格式
 */
export function validateLicenseKey(key) {
    if (!key || typeof key !== 'string') {
        return false;
    }
    
    // 许可证密钥应该是十六进制字符串
    const pattern = /^[a-fA-F0-9]+$/;
    return pattern.test(key) && key.length >= 32;
}

/**
 * 验证API密钥格式
 */
export function validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
        return false;
    }
    
    // API密钥应该至少32个字符
    return apiKey.length >= 32;
}

/**
 * 清理和验证JSON字符串
 */
export function validateAndParseJSON(jsonString) {
    try {
        if (!jsonString || typeof jsonString !== 'string') {
            return null;
        }
        
        const parsed = JSON.parse(jsonString);
        return parsed;
    } catch (error) {
        console.error('Invalid JSON string:', error.message);
        return null;
    }
}

/**
 * 验证时间戳
 */
export function validateTimestamp(timestamp) {
    if (timestamp == null) {
        return true; // null 表示永不过期
    }
    
    const num = parseInt(timestamp);
    if (isNaN(num) || num < 0) {
        return false;
    }
    
    // 检查是否是合理的时间戳（不能太远的未来）
    const maxFutureTime = Date.now() + (100 * 365 * 24 * 60 * 60 * 1000); // 100年后
    return num <= maxFutureTime;
}