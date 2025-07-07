/**
 * 管理接口处理器
 * 包含许可证发放、撤销等管理功能
 */

import { LicenseManager } from '../license.js';
import { createErrorResponse, createSuccessResponse, ErrorCodes } from '../errors.js';
import { validateApiKey } from '../utils/validation.js';

/**
 * 验证管理员API密钥
 */
function validateAdminAuth(request, config) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }

    const apiKey = authHeader.substring(7); // 移除 "Bearer " 前缀
    return config.adminApiKey && apiKey === config.adminApiKey;
}

/**
 * 处理许可证发放请求
 * POST /v1/admin/issue
 */
export async function handleIssueLicense(request, config) {
    try {
        // 检查请求方法
        if (request.method !== 'POST') {
            return new Response(
                JSON.stringify(createErrorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed')),
                { 
                    status: 405,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Allow': 'POST'
                    }
                }
            );
        }

        // 验证管理员权限
        if (!validateAdminAuth(request, config)) {
            return new Response(
                JSON.stringify(createErrorResponse(ErrorCodes.NO_PERMISSION, 'Invalid or missing API key')),
                { 
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // 解析请求体
        let requestData;
        try {
            requestData = await request.json();
        } catch (error) {
            return new Response(
                JSON.stringify(createErrorResponse(ErrorCodes.INVALID_INPUT, 'Invalid JSON in request body')),
                { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // 初始化许可证管理器
        const licenseManager = new LicenseManager(config);
        await licenseManager.initialize();

        // 发放许可证
        const result = await licenseManager.issueLicense(requestData);

        // 根据结果状态码确定HTTP状态码
        let httpStatus = 200;
        if (result.status !== ErrorCodes.SUCCESS) {
            switch (result.status) {
                case ErrorCodes.INVALID_INPUT:
                case ErrorCodes.INVALID_LICENSE_KEY:
                    httpStatus = 400;
                    break;
                case ErrorCodes.DUPLICATE_DATA:
                    httpStatus = 409;
                    break;
                case ErrorCodes.SERVER_ERROR:
                    httpStatus = 500;
                    break;
                default:
                    httpStatus = 400;
            }
        }

        return new Response(
            JSON.stringify(result),
            { 
                status: httpStatus,
                headers: { 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('Error in handleIssueLicense:', error);
        
        return new Response(
            JSON.stringify(createErrorResponse(ErrorCodes.SERVER_ERROR, 'Internal server error')),
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}/**
 * 处理许可证撤销请求
 * POST /v1/admin/revoke
 */
export async function handleRevokeLicense(request, config) {
    try {
        // 检查请求方法
        if (request.method !== 'POST') {
            return new Response(
                JSON.stringify(createErrorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed')),
                { 
                    status: 405,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Allow': 'POST'
                    }
                }
            );
        }

        // 验证管理员权限
        if (!validateAdminAuth(request, config)) {
            return new Response(
                JSON.stringify(createErrorResponse(ErrorCodes.NO_PERMISSION, 'Invalid or missing API key')),
                { 
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // 解析请求体
        let requestData;
        try {
            requestData = await request.json();
        } catch (error) {
            return new Response(
                JSON.stringify(createErrorResponse(ErrorCodes.INVALID_INPUT, 'Invalid JSON in request body')),
                { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // 初始化许可证管理器
        const licenseManager = new LicenseManager(config);
        await licenseManager.initialize();

        // 撤销许可证
        const result = await licenseManager.revokeLicense(requestData);

        // 根据结果状态码确定HTTP状态码
        let httpStatus = 200;
        if (result.status !== ErrorCodes.SUCCESS) {
            switch (result.status) {
                case ErrorCodes.INVALID_INPUT:
                case ErrorCodes.INVALID_LICENSE_KEY:
                    httpStatus = 400;
                    break;
                case ErrorCodes.SERVER_ERROR:
                    httpStatus = 500;
                    break;
                default:
                    httpStatus = 400;
            }
        }

        return new Response(
            JSON.stringify(result),
            { 
                status: httpStatus,
                headers: { 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('Error in handleRevokeLicense:', error);
        
        return new Response(
            JSON.stringify(createErrorResponse(ErrorCodes.SERVER_ERROR, 'Internal server error')),
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

/**
 * 处理健康检查请求
 * GET /v1/health
 */
export async function handleHealthCheck(request, config) {
    try {
        const healthData = {
            service: 'augment-license-server',
            status: 'healthy',
            timestamp: Date.now(),
            environment: config.environment,
            version: '1.0.0'
        };

        return new Response(
            JSON.stringify(createSuccessResponse(healthData, 'Service is healthy')),
            { 
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('Error in handleHealthCheck:', error);
        
        return new Response(
            JSON.stringify(createErrorResponse(ErrorCodes.SERVER_ERROR, 'Health check failed')),
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}