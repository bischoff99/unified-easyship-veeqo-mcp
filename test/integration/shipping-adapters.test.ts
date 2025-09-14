import { describe, it, expect, beforeAll } from 'vitest';
import { EasyPostClient } from '../../src/services/clients/easypost-enhanced.js';
import { VeeqoClient } from '../../src/services/clients/veeqo-enhanced.js';

describe('Shipping Clients (mock mode)', () => {
  beforeAll(() => {
    process.env.EASYPOST_API_KEY = 'mock';
    process.env.VEEQO_API_KEY = 'mock';
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'debug';
  });

  const mockAddress = {
    name: 'Test User',
    street1: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94105',
    country: 'US',
  };

  const mockParcel = {
    length: 10,
    width: 8,
    height: 4,
    weight: 1, // 1 lb
  };

  it('EasyPost client should work in mock mode', async () => {
    const easyPost = new EasyPostClient();

    // Test rate retrieval
    const rates = await easyPost.getRates(mockAddress, mockAddress, mockParcel);
    expect(rates.length).toBeGreaterThan(0);

    const rate = rates[0];
    expect(rate.rate).toBeDefined();
    expect(rate.carrier).toBeDefined();
    expect(rate.service).toBeDefined();
  });

  it('Veeqo client should work in mock mode', async () => {
    const veeqo = new VeeqoClient();

    // Test getting products
    const products = await veeqo.getProducts();
    expect(products).toBeDefined();
    expect(Array.isArray(products)).toBe(true);
  });
});