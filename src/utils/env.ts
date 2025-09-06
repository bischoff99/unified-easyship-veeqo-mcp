import { resolve } from 'node:path';

import { config } from 'dotenv';

export function loadEnv(): void {
  config({ path: resolve(process.cwd(), '.env') });

  const required = ['EASYPOST_API_KEY'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0 && process.env.EASYPOST_API_KEY !== 'mock') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
