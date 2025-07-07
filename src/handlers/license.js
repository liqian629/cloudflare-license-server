/**
 * 许可证验证 API 处理器
 * 对应原项目的 POST /v1/license 接口
 */

import { LicenseManager } from '../license.js';
import { createErrorResponse, createSuccessResponse, ErrorCodes } from '../errors.js';

/**
 * 处理许可证验证请求
 */
export async function handleLicenseValidation(request, config) {
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

        // 验证许可证
        const result = await licenseManager.validateLicense(requestData);

        // 根据结果状态码确定HTTP状态码
        let httpStatus = 200;
        if (result.status !== ErrorCodes.SUCCESS) {
            switch (result.status) {
                case ErrorCodes.INVALID_INPUT:
                case ErrorCodes.INVALID_LICENSE_KEY:
                    httpStatus = 400;
                    break;
                case ErrorCodes.LICENSE_REVOKED:
                case ErrorCodes.LICENSE_EXPIRED:
                case ErrorCodes.MACHINE_LIMIT_EXCEEDED:
                    httpStatus = 403;
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
        console.error('Error in handleLicenseValidation:', error);
        
        return new Response(
            JSON.stringify(createErrorResponse(ErrorCodes.SERVER_ERROR, 'Internal server error')),
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}