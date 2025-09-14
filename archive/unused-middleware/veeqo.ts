import { fetch } from 'undici';

import { ErrorCode, createError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 800;
const DEFAULT_TIMEOUT_MS = 30000;

export class VeeqoClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env.VEEQO_API_KEY ?? '';
    this.baseUrl = baseUrl ?? process.env.VEEQO_BASE_URL ?? 'https://api.veeqo.com';
    if (!this.apiKey) {
      throw createError(ErrorCode.INVALID_PARAMS, 'VEEQO_API_KEY is required');
    }
  }

  async request(path: string, options: any = {}): Promise<any> {
    if (this.apiKey === 'mock') {
      return this.mock(path, options);
    }

    const headers = {
      'x-api-key': this.apiKey,
      Accept: options.accept ?? 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    } as Record<string, string>;

    let lastErr: any;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), options.timeout ?? DEFAULT_TIMEOUT_MS);
      try {
        const res = await fetch(`${this.baseUrl}${path}`, {
          ...options,
          headers,
          signal: ctl.signal,
        });
        clearTimeout(to);

        if (res.status === 429) {
          const ra = res.headers.get('retry-after');
          const delay = ra ? parseInt(ra) * 1000 : BASE_DELAY_MS * 2 ** attempt;
          await this.sleep(delay);
          continue;
        }
        if (res.status >= 500 && attempt < MAX_RETRIES - 1) {
          await this.sleep(BASE_DELAY_MS * 2 ** attempt);
          continue;
        }
        if (!res.ok) {
          const text = await res.text();
          throw createError(ErrorCode.EXTERNAL_ERROR, `Veeqo API error: ${res.status} ${text}`);
        }
        const isPdf = headers.Accept === 'application/pdf';
        return isPdf ? Buffer.from(await res.arrayBuffer()) : await res.json();
      } catch (e: any) {
        lastErr =
          e?.name === 'AbortError'
            ? createError(ErrorCode.INTERNAL_ERROR, `Request timeout after ${DEFAULT_TIMEOUT_MS}ms`)
            : e;
        if (attempt < MAX_RETRIES - 1) {
          const delay = BASE_DELAY_MS * 2 ** attempt;
          logger.warn({ path, attempt, error: e?.message }, 'Veeqo request retry');
          await this.sleep(delay);
        }
      } finally {
        clearTimeout(to);
      }
    }
    throw lastErr;
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  private mock(path: string, _options: any): any {
    if (path === '/products') {
      return {
        products: [{ id: 123, name: 'Mock Tee', sku: 'TEE-001', stock_entries: [] }],
        page: 1,
      };
    }
    if (/\/sellables\/.+\/warehouses\/.+\/stock_entry/.test(path)) {
      return {
        sellable_id: 11,
        warehouse_id: 22,
        physical_stock_level: 10,
        available_stock_level: 9,
      };
    }
    if (/\/orders\/.+\/cancel$/.test(path)) {
      return { id: 'ord_mock', status: 'cancelled' };
    }
    if (/\/orders\/.+\/notes$/.test(path)) {
      return { id: 'note_mock', body: 'mock note' };
    }
    if (/\/rate_shopping\/labels\/.+/.test(path)) {
      return Buffer.from('%PDF-1.4 mock');
    }
    if (path === (process.env.VEEQO_ENDPOINT_RATES || '/rate_shopping/rates')) {
      return {
        rates: [
          {
            id: 'v_rate_1',
            carrier: 'UPS',
            service: 'Ground',
            price: 9.99,
            currency: 'USD',
            delivery_days: 3,
          },
        ],
      };
    }
    if (path === (process.env.VEEQO_ENDPOINT_PURCHASE || '/rate_shopping/labels')) {
      return {
        id: 'v_label_1',
        shipment_id: 'v_ship_1',
        tracking_number: '1ZMOCK',
        carrier: 'UPS',
        service: 'Ground',
      };
    }
    return { success: true };
  }
}
