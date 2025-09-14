/**
 * Authentication Middleware
 *
 * Provides comprehensive authentication and authorization for the MCP server
 */

import * as crypto from 'crypto';

import * as jwt from 'jsonwebtoken';
import { z } from 'zod';

import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Auth schemas
export const ApiKeySchema = z.object({
  key: z.string().min(32),
  userId: z.string(),
  role: z.enum(['admin', 'user', 'readonly']),
  scopes: z.array(z.string()).optional(),
  createdAt: z.date(),
  expiresAt: z.date().optional(),
  lastUsedAt: z.date().optional(),
});

export const JWTPayloadSchema = z.object({
  userId: z.string(),
  role: z.enum(['admin', 'user', 'readonly']),
  scopes: z.array(z.string()).optional(),
  iat: z.number(),
  exp: z.number(),
});

export type ApiKey = z.infer<typeof ApiKeySchema>;
export type JWTPayload = z.infer<typeof JWTPayloadSchema>;
export type AuthRole = 'admin' | 'user' | 'readonly';

/**
 * Auth service for managing authentication
 */
export class AuthService {
  private readonly apiKeys: Map<string, ApiKey> = new Map();
  private readonly jwtSecret: string;

  constructor() {
    this.jwtSecret = config.security.jwtSecret || this.generateSecret();

    // Initialize with default API keys in development
    if (config.server.nodeEnv === 'development') {
      this.initializeDevKeys();
    }
  }

  /**
   * Generate a secure random secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Initialize development API keys
   */
  private initializeDevKeys(): void {
    // Admin key for development
    const adminKey = 'admin_dev_key_' + crypto.randomBytes(16).toString('hex');
    this.apiKeys.set(adminKey, {
      key: adminKey,
      userId: 'dev_admin',
      role: 'admin',
      scopes: ['*'],
      createdAt: new Date(),
    });

    // User key for development
    const userKey = 'user_dev_key_' + crypto.randomBytes(16).toString('hex');
    this.apiKeys.set(userKey, {
      key: userKey,
      userId: 'dev_user',
      role: 'user',
      scopes: ['read', 'write'],
      createdAt: new Date(),
    });

    logger.info(
      {
        adminKey: adminKey.substring(0, 16) + '...',
        userKey: userKey.substring(0, 16) + '...',
      },
      'Development API keys initialized'
    );
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey: string): Promise<ApiKey | null> {
    const key = this.apiKeys.get(apiKey);

    if (!key) {
      logger.warn(
        {
          keyPrefix: apiKey.substring(0, 10) + '...',
        },
        'Invalid API key attempted'
      );
      return null;
    }

    // Check expiration
    if (key.expiresAt && key.expiresAt < new Date()) {
      logger.warn(
        {
          userId: key.userId,
          expiredAt: key.expiresAt,
        },
        'Expired API key used'
      );
      return null;
    }

    // Update last used timestamp
    key.lastUsedAt = new Date();
    this.apiKeys.set(apiKey, key);

    logger.debug(
      {
        userId: key.userId,
        role: key.role,
      },
      'API key validated'
    );

    return key;
  }

  /**
   * Generate JWT token
   */
  generateJWT(userId: string, role: AuthRole, scopes?: string[]): string {
    const payload: JWTPayload = {
      userId,
      role,
      scopes,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    };

    return jwt.sign(payload, this.jwtSecret);
  }

  /**
   * Validate JWT token
   */
  validateJWT(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      return JWTPayloadSchema.parse(decoded);
    } catch (error) {
      logger.warn({ error: (error as Error).message }, 'Invalid JWT token');
      return null;
    }
  }

  /**
   * Create new API key
   */
  createApiKey(userId: string, role: AuthRole, scopes?: string[]): string {
    const key = `${role}_${crypto.randomBytes(24).toString('hex')}`;

    this.apiKeys.set(key, {
      key,
      userId,
      role,
      scopes,
      createdAt: new Date(),
    });

    logger.info(
      {
        userId,
        role,
        keyPrefix: key.substring(0, 10) + '...',
      },
      'New API key created'
    );

    return key;
  }

  /**
   * Revoke API key
   */
  revokeApiKey(apiKey: string): boolean {
    const deleted = this.apiKeys.delete(apiKey);

    if (deleted) {
      logger.info(
        {
          keyPrefix: apiKey.substring(0, 10) + '...',
        },
        'API key revoked'
      );
    }

    return deleted;
  }

  /**
   * Check if role has permission for an action
   */
  hasPermission(role: AuthRole, action: string): boolean {
    const permissions: Record<AuthRole, string[]> = {
      admin: ['*'],
      user: ['read', 'write', 'execute'],
      readonly: ['read'],
    };

    const rolePermissions = permissions[role];
    return rolePermissions.includes('*') || rolePermissions.includes(action);
  }

  /**
   * Check if scopes include required scope
   */
  hasScope(scopes: string[] | undefined, requiredScope: string): boolean {
    if (!scopes) {
      return false;
    }
    return scopes.includes('*') || scopes.includes(requiredScope);
  }

  /**
   * Rate limiting check
   */
  private readonly rateLimitMap: Map<string, { count: number; resetAt: Date }> = new Map();

  checkRateLimit(userId: string): boolean {
    const now = new Date();
    const limit = this.rateLimitMap.get(userId);

    if (!limit || limit.resetAt < now) {
      // Reset or initialize rate limit
      this.rateLimitMap.set(userId, {
        count: 1,
        resetAt: new Date(now.getTime() + config.security.rateLimitWindow),
      });
      return true;
    }

    if (limit.count >= config.security.rateLimitMax) {
      logger.warn(
        {
          userId,
          count: limit.count,
          resetAt: limit.resetAt,
        },
        'Rate limit exceeded'
      );
      return false;
    }

    limit.count++;
    this.rateLimitMap.set(userId, limit);
    return true;
  }

  /**
   * Hash password for secure storage
   */
  hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verify password against hash
   */
  verifyPassword(password: string, hashedPassword: string): boolean {
    const [salt, hash] = hashedPassword.split(':');
    if (!salt || !hash) {
      return false;
    }
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }
}

// Export singleton instance
export const authService = new AuthService();

/**
 * Authentication middleware for FastMCP
 */
export async function authenticate(request: any): Promise<any> {
  const apiKey = request.headers['x-api-key'] as string;
  const authHeader = request.headers['authorization'] as string;

  // Try API key authentication first
  if (apiKey) {
    const key = await authService.validateApiKey(apiKey);
    if (key) {
      // Check rate limit
      if (!authService.checkRateLimit(key.userId)) {
        throw new Response(null, {
          status: 429,
          statusText: 'Rate limit exceeded',
        });
      }

      return {
        userId: key.userId,
        role: key.role,
        scopes: key.scopes,
        apiKey: key.key,
      };
    }
  }

  // Try JWT authentication
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = authService.validateJWT(token);

    if (payload) {
      // Check rate limit
      if (!authService.checkRateLimit(payload.userId)) {
        throw new Response(null, {
          status: 429,
          statusText: 'Rate limit exceeded',
        });
      }

      return {
        userId: payload.userId,
        role: payload.role,
        scopes: payload.scopes,
      };
    }
  }

  // No valid authentication found
  throw new Response(null, {
    status: 401,
    statusText: 'Authentication required',
  });
}

/**
 * Authorization decorator for tools
 */
export function requireRole(roles: AuthRole[]) {
  return (auth: any) => {
    if (!auth || !roles.includes(auth.role)) {
      return false;
    }
    return true;
  };
}

/**
 * Authorization decorator for scopes
 */
export function requireScope(scope: string) {
  return (auth: any) => {
    if (!auth || !authService.hasScope(auth.scopes, scope)) {
      return false;
    }
    return true;
  };
}
