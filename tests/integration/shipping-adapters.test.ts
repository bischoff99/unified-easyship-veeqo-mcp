import { describe, it, expect, beforeAll } from 'vitest';
import { EasyPostShippingAdapter } from '../../src/services/clients/easypost-shipping-adapter.js';
import { VeeqoShippingAdapter } from '../../src/services/clients/veeqo-shipping-adapter.js';
import { ShipmentRequest } from '../../src/core/types.js';

describe('Shipping Adapters (mock mode)', () => {
  beforeAll(() => {
    process.env.EASYPOST_API_KEY = 'mock';
    process.env.VEEQO_API_KEY = 'mock';
    process.env.NODE_ENV = 'test';
  });

  const request: ShipmentRequest = {
    from: {
      name: 'Sender',
      street1: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      country: 'US',
    },
    to: {
      name: 'Recipient',
      street1: '456 Oak Ave',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US',
    },
    parcel: {
      length: 10,
      width: 8,
      height: 4,
      weightOz: 16,
    },
  };

  it('EasyPost adapter should return rates and create label in mock mode', async () => {
    const adapter = new EasyPostShippingAdapter();
    const rates = await adapter.getRates(request);
    expect(rates.length).toBeGreaterThan(0);
    const first = rates[0];
    const label = await adapter.buyLabel({ ...request, carrier: first.carrier, service: first.service });
    expect(label.trackingCode).toBeTruthy();
    expect(label.provider).toBe('easypost');
  });

  it('Veeqo adapter should return rates and create label in mock mode', async () => {
    const adapter = new VeeqoShippingAdapter();
    const rates = await adapter.getRates(request);
    // In mock path we may have at least one rate
    expect(Array.isArray(rates)).toBeTruthy();
    const label = await adapter.buyLabel({ ...request, carrier: 'UPS', service: 'Ground' });
    expect(label.trackingCode).toBeTruthy();
    expect(label.provider).toBe('veeqo');
  });
});

