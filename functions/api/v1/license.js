/**
 * Cloudflare Pages Functions - License Validation API
 */

import { Config } from '../../../src/config.js';
import { handleLicenseValidation } from '../../../src/handlers/license.js';

export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        const config = new Config(env);
        return await handleLicenseValidation(request, config);
    } catch (error) {
        console.error('Error in license validation:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}