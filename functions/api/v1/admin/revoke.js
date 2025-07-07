/**
 * Cloudflare Pages Functions - Revoke License API
 */

import { Config } from '../../../../src/config.js';
import { handleRevokeLicense } from '../../../../src/handlers/admin.js';

export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        const config = new Config(env);
        return await handleRevokeLicense(request, config);
    } catch (error) {
        console.error('Error in revoke license:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}