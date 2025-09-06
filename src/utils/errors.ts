export enum ErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  EXTERNAL_ERROR = -32001,
}

export function createError(code: ErrorCode, message: string, details?: any) {
  return { code, message, details };
}
