/**
 * Environment variable utilities
 */

export function loadEnv(): void {
  // Load environment variables from .env file if it exists
  try {
    require('dotenv').config();
  } catch {
    // dotenv is optional
  }
}

export function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

export function getEnvVarAsNumber(name: string, defaultValue?: number): number {
  const value = process.env[name];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${name} is required`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }
  return parsed;
}

export function getEnvVarAsBoolean(name: string, defaultValue?: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${name} is required`);
  }
  return value.toLowerCase() === 'true';
}
