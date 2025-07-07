/**
 * Cloudflare Workers 主入口文件
 * Augment License Server
 */

import { Config } from './config.js';
import { handleLicenseValidation } from './handlers/license.js';
import { handleIssueLicense, handleRevokeLicense, handleHealthCheck } from './handlers/admin.js';
import { createErrorResponse, ErrorCodes } from './errors.js';

/**
 * 路由处理器
 */
async function handleRequest(request, env, ctx) {
    try {
        // 初始化配置
        const config = new Config(env);
        
        // 解析URL
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // 设置CORS头
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        };

        // 处理预检请求
        if (method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: corsHeaders
            });
        }

        // 路由分发
        let response;
        
        switch (path) {
            case '/v1/license':
                response = await handleLicenseValidation(request, config);
                break;
                
            case '/v1/admin/issue':
                response = await handleIssueLicense(request, config);
                break;
                
            case '/v1/admin/revoke':
                response = await handleRevokeLicense(request, config);
                break;
                
            case '/v1/health':
            case '/health':
                response = await handleHealthCheck(request, config);
                break;
                
            case '/':
                // 根路径返回服务信息
                const serviceInfo = {
                    service: 'Augment License Server',
                    version: '1.0.0',
                    environment: config.environment,
                    endpoints: [
                        'POST /v1/license - Validate license key',
                        'POST /v1/admin/issue - Issue new license (requires API key)',
                        'POST /v1/admin/revoke - Revoke license (requires API key)',
                        'GET /v1/health - Health check'
                    ]
                };
                
                response = new Response(
                    JSON.stringify(serviceInfo, null, 2),
                    { 
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
                break;
                
            default:
                response = new Response(
                    JSON.stringify(createErrorResponse(ErrorCodes.BAD_REQUEST, 'Endpoint not found')),
                    { 
                        status: 404,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
        }

        // 添加CORS头到响应
        Object.entries(corsHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
        });

        return response;

    } catch (error) {
        console.error('Unhandled error in main handler:', error);
        
        return new Response(
            JSON.stringify(createErrorResponse(ErrorCodes.SERVER_ERROR, 'Internal server error')),
            { 
                status: 500,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        );
    }
}

// Cloudflare Workers 导出
export default {
    async fetch(request, env, ctx) {
        return handleRequest(request, env, ctx);
    }
};