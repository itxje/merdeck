import type { ApiError, ContentVersion, ErrorCode } from './contracts'

export const errorStatus = {
  invalid_request: 400,
  method_not_allowed: 405,
  unsupported_media_type: 415,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  deleted: 410,
  conflict: 409,
  exists: 409,
  not_empty: 409,
  unsupported: 415,
  filesystem_unsupported: 503,
  too_large: 413,
  rate_limited: 429,
  unavailable: 503,
  internal_error: 500,
} as const satisfies Record<ErrorCode, number>

const messages: Record<ErrorCode, string> = {
  invalid_request: 'The request is invalid.',
  method_not_allowed: 'The HTTP method is not allowed.',
  unsupported_media_type: 'Use an uncompressed application/json request body.',
  unauthorized: 'Sign in to continue.',
  forbidden: 'Access is not allowed.',
  not_found: 'The requested resource was not found.',
  deleted: 'The selected file no longer exists.',
  conflict: 'The file changed. Reload before saving.',
  exists: 'An entry with that name already exists.',
  not_empty: 'The folder is not empty.',
  unsupported: 'This document cannot be edited.',
  filesystem_unsupported: 'Saving is unavailable on this filesystem. Ask the operator to verify write support for the configured project.',
  too_large: 'The configured size limit was exceeded.',
  rate_limited: 'Too many requests. Try again later.',
  unavailable: 'The project is temporarily unavailable.',
  internal_error: 'An unexpected error occurred.',
}

export class AppError extends Error {
  readonly code: ErrorCode
  readonly currentVersion: ContentVersion | undefined

  constructor(code: ErrorCode, currentVersion?: ContentVersion) {
    super(messages[code])
    this.name = 'AppError'
    this.code = code
    this.currentVersion = currentVersion
  }

  toResponse(): ApiError {
    return {
      code: this.code,
      message: this.message,
      ...(this.code === 'conflict' && this.currentVersion ? { currentVersion: this.currentVersion } : {}),
    }
  }
}

export function safeError(error: unknown): AppError {
  return error instanceof AppError ? error : new AppError('internal_error')
}
