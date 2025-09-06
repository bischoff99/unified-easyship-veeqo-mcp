/**
 * Authentication Utilities
 * Simple auth implementation using built-in Node.js crypto
 */

import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthToken {
  userId: string;
  role: 'admin' | 'user' | 'readonly';
  exp?: number;
}

/**
 * Generate a simple JWT-like token
 */
export function generateToken(payload: AuthToken): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  
  // Add expiration if not set (24 hours)
  if (!payload.exp) {
    payload.exp = Date.now() + 24 * 60 * 60 * 1000;
  }
  
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerBase64}.${payloadBase64}`)
    .digest('base64url');
    
  return `${headerBase64}.${payloadBase64}.${signature}`;
}

/**
 * Verify and decode token
 */
export function verifyToken(token: string): AuthToken | null {
  try {
    const [headerBase64, payloadBase64, signature] = token.split('.');
    
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerBase64}.${payloadBase64}`)
      .digest('base64url');
      
    if (signature !== expectedSignature) {
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString());
    
    // Check expiration
    if (payload.exp && payload.exp < Date.now()) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

/**
 * Hash API key
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Generate secure API key
 */
export function generateApiKey(prefix: string = 'key'): string {
  return `${prefix}_${crypto.randomBytes(32).toString('hex')}`;
}