import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';

import { fetch } from 'undici';

import { ErrorCode, createError } from './utils/errors.js';
import { logger } from './utils/logger.js';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const DEFAULT_TIMEOUT_MS = 30000;

export class EasyPostClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly idempotencyKeys = new Map<string, string>();

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env.EASYPOST_API_KEY ?? '';
    this.baseUrl = baseUrl ?? process.env.EASYPOST_BASE_URL ?? 'https://api.easypost.com/v2';
    if (!this.apiKey) {
      throw createError(ErrorCode.INVALID_PARAMS, 'EASYPOST_API_KEY is required');
    }
  }

  async request(endpoint: string, options: any = {}): Promise<any> {
    if (this.apiKey === 'mock') {
      return this.mockResponse(endpoint, options);
    }

    const auth = Buffer.from(`${this.apiKey}:`).toString('base64');
    const headers: any = {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Idempotency for buy/creates
    const isPost = (options.method || 'GET').toUpperCase() === 'POST';
    if (
      isPost &&
      (/\/buy$/.test(endpoint) || /customs_/.test(endpoint) || /trackers/.test(endpoint))
    ) {
      const key = this.getIdempotencyKey(endpoint, options.body ?? '');
      headers['X-Idempotency-Key'] = key;
    }

    let lastErr: any;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeout ?? DEFAULT_TIMEOUT_MS);

      try {
        const res = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          signal: controller.signal,
          headers,
        });
        clearTimeout(timeout);

        if (res.status === 429) {
          const retryAfter = res.headers.get('retry-after');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : BASE_DELAY_MS * 2 ** attempt;
          logger.warn({ endpoint, attempt, delay, retryAfter }, 'Rate limited (429)');
          await this.sleep(delay);
          continue;
        }

        if (res.status >= 500 && attempt < MAX_RETRIES - 1) {
          const delay = BASE_DELAY_MS * 2 ** attempt;
          logger.warn({ endpoint, attempt, status: res.status }, 'Server error, retrying');
          await this.sleep(delay);
          continue;
        }

        if (!res.ok) {
          const text = await res.text();
          throw createError(ErrorCode.EXTERNAL_ERROR, `EasyPost API error: ${res.status} ${text}`);
        }

        const text = await res.text();
        return text ? JSON.parse(text) : {};
      } catch (e: any) {
        lastErr =
          e?.name === 'AbortError'
            ? createError(ErrorCode.INTERNAL_ERROR, `Request timeout after ${DEFAULT_TIMEOUT_MS}ms`)
            : e;
        if (attempt < MAX_RETRIES - 1) {
          const delay = BASE_DELAY_MS * 2 ** attempt;
          logger.warn({ endpoint, attempt, error: e?.message }, 'Request failed, retrying');
          await this.sleep(delay);
        }
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastErr;
  }

  private getIdempotencyKey(endpoint: string, body: string): string {
    const cacheKey = `${endpoint}:${body}`;
    if (!this.idempotencyKeys.has(cacheKey)) {
      this.idempotencyKeys.set(cacheKey, randomUUID());
      setTimeout(() => this.idempotencyKeys.delete(cacheKey), 24 * 60 * 60 * 1000);
    }
    return this.idempotencyKeys.get(cacheKey)!;
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  private mockResponse(endpoint: string, _options: any): any {
    if (endpoint.includes('/customs_items')) {
      return {
        id: 'ci_mock123',
        description: 'T-Shirt',
        quantity: 2,
        weight: 5.5,
        value: 25.0,
        hs_tariff_number: '6109100000',
        origin_country: 'US',
      };
    }
    if (endpoint.includes('/customs_infos')) {
      return {
        id: 'cstinfo_mock456',
        contents_type: 'merchandise',
        customs_items: [{ id: 'ci_mock123' }],
        created_at: new Date().toISOString(),
      };
    }
    if (endpoint.includes('/addresses')) {
      return {
        id: 'adr_mock123',
        street1: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105',
        country: 'US',
        verifications: { delivery: { success: true, errors: [] } },
      };
    }
    if (endpoint.includes('/shipments') && endpoint.endsWith('/refund')) {
      return { id: 'shp_mock456', refund_status: 'requested' };
    }
    if (endpoint.includes('/shipments')) {
      return {
        id: 'shp_mock456',
        rates: [
          {
            id: 'rate_mock789',
            carrier: 'USPS',
            service: 'Priority',
            rate: '7.90',
            currency: 'USD',
            delivery_days: 2,
          },
          {
            id: 'rate_mock790',
            carrier: 'USPS',
            service: 'Express',
            rate: '29.90',
            currency: 'USD',
            delivery_days: 1,
          },
        ],
        postage_label: { label_url: 'https://example/label.pdf', label_file_type: 'PDF' },
        tracking_code: '9400...MOCK',
      };
    }
    if (endpoint.includes('/trackers')) {
      return {
        id: 'trk_mock',
        status: 'pre_transit',
        tracking_code: '9400...MOCK',
        tracking_details: [],
        public_url: 'https://track.easypost.com/...mock',
      };
    }
    if (endpoint.includes('/carrier_types')) {
      return [{ type: 'UPS', readable: 'UPS' }];
    }
    if (endpoint.includes('/webhooks')) {
      return { id: 'hook_mock', url: 'https://example/webhook' };
    }
    return { success: true };
  }
}
