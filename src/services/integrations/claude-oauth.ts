/**
 * Claude Code OAuth Authentication Helper
 *
 * This module provides OAuth authentication for Claude Code SDK
 * instead of using API keys.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export interface ClaudeAuthStatus {
  isAuthenticated: boolean;
  user?: string;
  error?: string;
}

/**
 * Check if Claude Code is authenticated via OAuth
 */
export async function checkClaudeAuthStatus(): Promise<ClaudeAuthStatus> {
  try {
    const { stdout, stderr } = await execAsync('claude auth status');

    if (stderr) {
      logger.warn({ stderr }, 'Claude auth status warning');
    }

    // Parse the output to determine authentication status
    const isAuthenticated = stdout.includes('authenticated') || stdout.includes('logged in');
    const userMatch = stdout.match(/user[:\s]+([^\n]+)/i);
    const user = userMatch && userMatch[1] ? userMatch[1].trim() : undefined;

    return {
      isAuthenticated,
      user,
    };
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to check Claude auth status');
    return {
      isAuthenticated: false,
      error: error.message,
    };
  }
}

/**
 * Initialize Claude Code OAuth authentication
 */
export async function initializeClaudeOAuth(): Promise<boolean> {
  try {
    logger.info('Initializing Claude Code OAuth authentication...');

    const authStatus = await checkClaudeAuthStatus();

    if (authStatus.isAuthenticated) {
      logger.info({ user: authStatus.user }, 'Claude Code already authenticated');
      return true;
    }

    logger.info('Claude Code not authenticated. Please run: claude auth login');
    return false;
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to initialize Claude OAuth');
    return false;
  }
}

/**
 * Test Claude Code OAuth connection
 */
export async function testClaudeOAuthConnection(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('claude --version');
    logger.info({ version: stdout.trim() }, 'Claude Code version check successful');
    return true;
  } catch (error: any) {
    logger.error({ error: error.message }, 'Claude Code not available');
    return false;
  }
}

/**
 * Get Claude Code authentication info
 */
export async function getClaudeAuthInfo(): Promise<{
  isAvailable: boolean;
  isAuthenticated: boolean;
  user?: string;
  version?: string;
}> {
  try {
    const [versionResult, authStatus] = await Promise.all([
      execAsync('claude --version').catch(() => ({ stdout: '' })),
      checkClaudeAuthStatus(),
    ]);

    return {
      isAvailable: Boolean(versionResult.stdout),
      isAuthenticated: authStatus.isAuthenticated,
      user: authStatus.user,
      version: versionResult.stdout?.trim(),
    };
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get Claude auth info');
    return {
      isAvailable: false,
      isAuthenticated: false,
    };
  }
}
