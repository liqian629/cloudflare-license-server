/**
 * 错误代码定义
 * 保持与原项目兼容
 */

export const ErrorCodes = {
    SUCCESS: 0,
    BAD_REQUEST: 1,
    NULL_DATA: 2,
    NO_PERMISSION: 3,
    INVALID_INPUT: 4,
    SERVER_ERROR: 5,
    DUPLICATE_DATA: 6,
    INVALID_CAPTCHA: 7,
    INVALID_CREDENTIAL: 8,
    INVALID_CODE: 9,
    LOGIN_REQUIRED: 10,
    PENDING: 11,
    ACCOUNT_DISABLED: 12,
    FAILURE: 13,
    
    // 新增错误代码
    LICENSE_EXPIRED: 14,
    LICENSE_REVOKED: 15,
    MACHINE_LIMIT_EXCEEDED: 16,
    INVALID_LICENSE_KEY: 17,
    DATABASE_ERROR: 18
};

export const ErrorMessages = {
    [ErrorCodes.SUCCESS]: 'Success',
    [ErrorCodes.BAD_REQUEST]: 'Bad request',
    [ErrorCodes.NULL_DATA]: 'No data found',
    [ErrorCodes.NO_PERMISSION]: 'No permission',
    [ErrorCodes.INVALID_INPUT]: 'Invalid input',
    [ErrorCodes.SERVER_ERROR]: 'Server error',
    [ErrorCodes.DUPLICATE_DATA]: 'Duplicate data',
    [ErrorCodes.INVALID_CAPTCHA]: 'Invalid captcha',
    [ErrorCodes.INVALID_CREDENTIAL]: 'Invalid credential',
    [ErrorCodes.INVALID_CODE]: 'Invalid code',
    [ErrorCodes.LOGIN_REQUIRED]: 'Login required',
    [ErrorCodes.PENDING]: 'Pending',
    [ErrorCodes.ACCOUNT_DISABLED]: 'Account disabled',
    [ErrorCodes.FAILURE]: 'Failure',
    [ErrorCodes.LICENSE_EXPIRED]: 'License expired',
    [ErrorCodes.LICENSE_REVOKED]: 'License revoked',
    [ErrorCodes.MACHINE_LIMIT_EXCEEDED]: 'Machine limit exceeded',
    [ErrorCodes.INVALID_LICENSE_KEY]: 'Invalid license key',
    [ErrorCodes.DATABASE_ERROR]: 'Database error'
};

/**
 * 创建标准化的错误响应
 */
export function createErrorResponse(code, message = null, data = null) {
    return {
        status: code,
        message: message || ErrorMessages[code] || 'Unknown error',
        data: data,
        timestamp: Date.now()
    };
}

/**
 * 创建成功响应
 */
export function createSuccessResponse(data = null, message = null) {
    return {
        status: ErrorCodes.SUCCESS,
        message: message || ErrorMessages[ErrorCodes.SUCCESS],
        data: data,
        timestamp: Date.now()
    };
}