/**
 * RSA 加密工具模块
 * 使用 Web Crypto API 实现，兼容原项目的加密逻辑
 */

/**
 * 将 PEM 格式的密钥转换为 ArrayBuffer
 */
function pemToArrayBuffer(pem) {
    // 移除 PEM 头尾和换行符
    const pemHeader = '-----BEGIN';
    const pemFooter = '-----END';
    
    const pemContents = pem
        .split('\n')
        .filter(line => !line.includes(pemHeader) && !line.includes(pemFooter))
        .join('');
    
    // Base64 解码
    const binaryString = atob(pemContents);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes.buffer;
}

/**
 * 导入 RSA 私钥
 */
export async function importPrivateKey(pemKey, algorithm = { name: 'RSA-OAEP', hash: 'SHA-256' }) {
    try {
        const keyData = pemToArrayBuffer(pemKey);
        return await crypto.subtle.importKey(
            'pkcs8',
            keyData,
            algorithm,
            false,
            ['decrypt']
        );
    } catch (error) {
        throw new Error(`Failed to import private key: ${error.message}`);
    }
}

/**
 * 导入 RSA 公钥
 */
export async function importPublicKey(pemKey, algorithm = { name: 'RSA-OAEP', hash: 'SHA-256' }) {
    try {
        const keyData = pemToArrayBuffer(pemKey);
        return await crypto.subtle.importKey(
            'spki',
            keyData,
            algorithm,
            false,
            ['encrypt']
        );
    } catch (error) {
        throw new Error(`Failed to import public key: ${error.message}`);
    }
}/**
 * 分块加密数据（兼容原项目逻辑）
 */
export async function encryptData(publicKey, data, maxChunkSize = 86) {
    const dataBuffer = typeof data === 'string' ? 
        new TextEncoder().encode(data) : 
        new Uint8Array(data);
    
    const chunks = [];
    let offset = 0;
    
    while (offset < dataBuffer.length) {
        const chunkSize = Math.min(maxChunkSize, dataBuffer.length - offset);
        const chunk = dataBuffer.slice(offset, offset + chunkSize);
        
        const encryptedChunk = await crypto.subtle.encrypt(
            'RSA-OAEP',
            publicKey,
            chunk
        );
        
        chunks.push(new Uint8Array(encryptedChunk));
        offset += chunkSize;
    }
    
    // 合并所有加密块
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let resultOffset = 0;
    
    for (const chunk of chunks) {
        result.set(chunk, resultOffset);
        resultOffset += chunk.length;
    }
    
    return result.buffer;
}

/**
 * 分块解密数据（兼容原项目逻辑）
 */
export async function decryptData(privateKey, encryptedData, maxChunkSize = 128) {
    const dataBuffer = new Uint8Array(encryptedData);
    const chunks = [];
    let offset = 0;
    
    while (offset < dataBuffer.length) {
        const chunkSize = Math.min(maxChunkSize, dataBuffer.length - offset);
        const chunk = dataBuffer.slice(offset, offset + chunkSize);
        
        const decryptedChunk = await crypto.subtle.decrypt(
            'RSA-OAEP',
            privateKey,
            chunk
        );
        
        chunks.push(new Uint8Array(decryptedChunk));
        offset += chunkSize;
    }
    
    // 合并所有解密块
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let resultOffset = 0;
    
    for (const chunk of chunks) {
        result.set(chunk, resultOffset);
        resultOffset += chunk.length;
    }
    
    return result.buffer;
}

/**
 * 生成数据的 SHA-256 哈希值
 */
export async function generateHash(data) {
    const encoder = new TextEncoder();
    const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    
    // 转换为十六进制字符串
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 生成随机字符串
 */
export function generateRandomString(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    
    for (let i = 0; i < length; i++) {
        result += chars[randomValues[i] % chars.length];
    }
    
    return result;
}