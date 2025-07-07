/**
 * Cloudflare Pages Functions - Health Check API
 */

import { Config } from '../../../src/config.js';
import { handleHealthCheck } from '../../../src/handlers/admin.js';

export async function onRequestGet(context) {
    const { request, env } = context;
    
    try {
        const config = new Config(env);
        return await handleHealthCheck(request, config);
    } catch (error) {
        console.error('Error in health check:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}