/**
 * Unit tests for EasyPost client implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EasyPostClient } from '@/services/clients/easypost-enhanced';
import {
  mockEasyPostAddress,
  mockEasyPostParcel,
  mockEasyPostRates,
  mockShippingLabel,
} from '@test/mocks/easypost';

// Mock the config
vi.mock('@/config/index.js', () => ({
  config: {
    easypost: {
      apiKey: 'test-key',
      baseUrl: 'https://api.easypost.com/v2',
      timeout: 30000,
      mockMode: false,
    },
  },
}));

// Mock the logger
vi.mock('@/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock fetch since the client uses fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('EasyPostClient', () => {
  let client: EasyPostClient;

  beforeEach(() => {
    client = new EasyPostClient();
    vi.clearAllMocks();
  });

  describe('getRates', () => {
    it('should return shipping rates for valid addresses and parcel', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            rates: mockEasyPostRates,
          }),
      });

      const rates = await client.getRates(
        mockEasyPostAddress,
        mockEasyPostAddress,
        mockEasyPostParcel
      );

      expect(rates).toHaveLength(3);
      expect(rates[0]).toMatchObject({
        carrier: 'USPS',
        service: 'Priority',
        rate: '8.15',
        delivery_days: 2,
      });
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error: {
              message: 'Invalid address',
              code: 'ADDRESS.INVALID',
            },
          }),
      });

      await expect(
        client.getRates(mockEasyPostAddress, mockEasyPostAddress, mockEasyPostParcel)
      ).rejects.toThrow('Invalid address');
    });

    it('should validate input parameters', async () => {
      const invalidAddress = { ...mockEasyPostAddress, zip: '' };

      // Mock the EasyPost API error response for invalid address
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error: {
              message: 'ZIP code is required',
              code: 'ADDRESS.INVALID',
            },
          }),
      });

      await expect(
        client.getRates(invalidAddress, mockEasyPostAddress, mockEasyPostParcel)
      ).rejects.toThrow('ZIP code is required');
    });
  });

  describe('createLabel', () => {
    it('should create a shipping label successfully', async () => {
      // First mock for createShipment call
      const mockShipment = {
        id: 'shp_test123',
        rates: [
          {
            id: 'rate_test123',
            carrier: 'UPS',
            service: 'Ground',
            rate: '7.89',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockShipment),
      });

      // Second mock for buyShipment call
      const mockBoughtShipment = {
        tracking_code: '1Z999AA1234567890',
        selected_rate: {
          carrier: 'UPS',
          service: 'Ground',
          rate: '7.89',
        },
        postage_label: {
          label_url: 'https://example.com/label.pdf',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockBoughtShipment),
      });

      const label = await client.createLabel(
        mockEasyPostAddress,
        mockEasyPostAddress,
        mockEasyPostParcel,
        'UPS',
        'Ground'
      );

      expect(label).toMatchObject({
        tracking_code: '1Z999AA1234567890',
        carrier: 'UPS',
        service: 'Ground',
        rate: '7.89',
        label_url: expect.stringContaining('https://'),
      });
    });

    it('should handle label creation failures', async () => {
      // First mock for createShipment call (success)
      const mockShipment = {
        id: 'shp_test123',
        rates: [
          {
            id: 'rate_test123',
            carrier: 'UPS',
            service: 'Ground',
            rate: '7.89',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockShipment),
      });

      // Second mock for buyShipment call (failure)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: () =>
          Promise.resolve({
            error: {
              message: 'Insufficient funds',
              code: 'BILLING.INSUFFICIENT_FUNDS',
            },
          }),
      });

      await expect(
        client.createLabel(
          mockEasyPostAddress,
          mockEasyPostAddress,
          mockEasyPostParcel,
          'UPS',
          'Ground'
        )
      ).rejects.toThrow('Insufficient funds');
    });
  });

  describe('verifyAddress', () => {
    it('should verify an address and return validation results', async () => {
      const mockValidation = {
        id: 'adr_test123',
        name: 'John Doe',
        street1: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105-1804',
        country: 'US',
        verifications: {
          zip4: { success: true },
          delivery: { success: true },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockValidation),
      });

      const result = await client.verifyAddress(mockEasyPostAddress);

      expect(result).toMatchObject({
        id: 'adr_test123',
        street1: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105-1804',
        verifications: expect.any(Object),
      });
    });

    it('should handle address verification failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: () =>
          Promise.resolve({
            error: {
              message: 'Address verification failed',
              code: 'ADDRESS.VERIFICATION_FAILED',
            },
          }),
      });

      await expect(client.verifyAddress(mockEasyPostAddress)).rejects.toThrow(
        'Address verification failed'
      );
    });
  });

  describe('trackShipment', () => {
    it('should track a shipment by tracking number', async () => {
      const mockTracking = {
        tracking_code: '1Z999AA1234567890',
        status: 'delivered',
        status_detail: 'delivered',
        carrier: 'UPS',
        tracking_details: [
          {
            datetime: '2024-01-16T18:00:00Z',
            message: 'Package delivered',
            status: 'delivered',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockTracking),
      });

      const result = await client.trackShipment('1Z999AA1234567890');

      expect(result).toMatchObject({
        status: 'delivered',
        status_detail: 'delivered',
        carrier: 'UPS',
        tracking_details: expect.any(Array),
      });
    });

    it('should handle tracking failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({
            error: {
              message: 'Tracking number not found',
              code: 'TRACKING.NOT_FOUND',
            },
          }),
      });

      await expect(client.trackShipment('INVALID123')).rejects.toThrow('Tracking number not found');
    });
  });

  describe('error handling', () => {
    it('should handle network timeouts', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(
        client.getRates(mockEasyPostAddress, mockEasyPostAddress, mockEasyPostParcel)
      ).rejects.toThrow('Request timeout');
    });

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({
          'retry-after': '60',
        }),
        json: () =>
          Promise.resolve({
            error: {
              message: 'Rate limit exceeded',
              code: 'RATE_LIMIT.EXCEEDED',
            },
          }),
      });

      await expect(
        client.getRates(mockEasyPostAddress, mockEasyPostAddress, mockEasyPostParcel)
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('input validation', () => {
    it('should handle API validation errors for invalid addresses', async () => {
      const invalidAddress = { ...mockEasyPostAddress, name: '' };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: () =>
          Promise.resolve({
            error: {
              message: 'Address name is required',
              code: 'ADDRESS.INVALID',
            },
          }),
      });

      await expect(
        client.getRates(invalidAddress, mockEasyPostAddress, mockEasyPostParcel)
      ).rejects.toThrow('Address name is required');
    });

    it('should handle API validation errors for invalid parcel dimensions', async () => {
      const invalidParcel = { ...mockEasyPostParcel, weight: 0 };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: () =>
          Promise.resolve({
            error: {
              message: 'Parcel weight must be greater than 0',
              code: 'PARCEL.INVALID',
            },
          }),
      });

      await expect(
        client.getRates(mockEasyPostAddress, mockEasyPostAddress, invalidParcel)
      ).rejects.toThrow('Parcel weight must be greater than 0');
    });
  });
});
