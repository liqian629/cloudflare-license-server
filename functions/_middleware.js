/**
 * Cloudflare Pages Functions 中间件
 * 将 Workers 代码适配到 Pages Functions
 */

import { Config } from '../src/config.js';
import { handleLicenseValidation } from '../src/handlers/license.js';
import { handleIssueLicense, handleRevokeLicense, handleHealthCheck } from '../src/handlers/admin.js';
import { createErrorResponse, ErrorCodes } from '../src/errors.js';

/**
 * Pages Functions 主处理器
 */
export async function onRequest(context) {
    const { request, env } = context;
    
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
            case '/api/v1/license':
            case '/v1/license':
                response = await handleLicenseValidation(request, config);
                break;
                
            case '/api/v1/admin/issue':
            case '/v1/admin/issue':
                response = await handleIssueLicense(request, config);
                break;
                
            case '/api/v1/admin/revoke':
            case '/v1/admin/revoke':
                response = await handleRevokeLicense(request, config);
                break;
                
            case '/api/v1/health':
            case '/v1/health':
            case '/health':
                response = await handleHealthCheck(request, config);
                break;
                
            case '/':
            case '/api':
                // 根路径返回服务信息
                const serviceInfo = {
                    service: 'Augment License Server',
                    version: '1.0.0',
                    platform: 'Cloudflare Pages',
                    environment: config.environment,
                    endpoints: [
                        'POST /api/v1/license - Validate license key',
                        'POST /api/v1/admin/issue - Issue new license (requires API key)',
                        'POST /api/v1/admin/revoke - Revoke license (requires API key)',
                        'GET /api/v1/health - Health check'
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
        console.error('Unhandled error in Pages Functions:', error);
        
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