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
      mockRequest.mockResolvedValueOnce({
        statusCode: 400,
        body: {
          json: () =>
            Promise.resolve({
              error: {
                message: 'Invalid address',
                code: 'ADDRESS.INVALID',
              },
            }),
        },
      });

      await expect(
        client.getRates(mockEasyPostAddress, mockEasyPostAddress, mockEasyPostParcel)
      ).rejects.toThrow('Invalid address');
    });

    it('should validate input parameters', async () => {
      const invalidAddress = { ...mockEasyPostAddress, zip: '' };

      await expect(
        client.getRates(invalidAddress, mockEasyPostAddress, mockEasyPostParcel)
      ).rejects.toThrow('ZIP code is required');
    });
  });

  describe('createLabel', () => {
    it('should create a shipping label successfully', async () => {
      mockRequest.mockResolvedValueOnce({
        statusCode: 201,
        body: {
          json: () => Promise.resolve(mockShippingLabel),
        },
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
      mockRequest.mockResolvedValueOnce({
        statusCode: 422,
        body: {
          json: () =>
            Promise.resolve({
              error: {
                message: 'Insufficient funds',
                code: 'BILLING.INSUFFICIENT_FUNDS',
              },
            }),
        },
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
        street1: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105-1804',
        verifications: {
          zip4: { success: true },
          delivery: { success: true },
        },
      };

      mockRequest.mockResolvedValueOnce({
        statusCode: 200,
        body: {
          json: () => Promise.resolve(mockValidation),
        },
      });

      const result = await client.verifyAddress(mockEasyPostAddress);

      expect(result).toMatchObject({
        verified: true,
        suggestions: expect.any(Array),
        confidence: expect.any(String),
      });
    });

    it('should handle invalid addresses', async () => {
      mockRequest.mockResolvedValueOnce({
        statusCode: 200,
        body: {
          json: () =>
            Promise.resolve({
              id: 'adr_test123',
              verifications: {
                zip4: { success: false, errors: [{ message: 'Invalid ZIP code' }] },
                delivery: { success: false, errors: [{ message: 'Address not deliverable' }] },
              },
            }),
        },
      });

      const result = await client.verifyAddress(mockEasyPostAddress);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Invalid ZIP code');
    });
  });

  describe('trackShipment', () => {
    it('should track a shipment by tracking number', async () => {
      const mockTracking = {
        tracking_code: '1Z999AA1234567890',
        status: 'delivered',
        carrier: 'UPS',
        tracking_details: [
          {
            datetime: '2024-01-16T18:00:00Z',
            message: 'Package delivered',
            status: 'delivered',
          },
        ],
      };

      mockRequest.mockResolvedValueOnce({
        statusCode: 200,
        body: {
          json: () => Promise.resolve(mockTracking),
        },
      });

      const result = await client.trackShipment('1Z999AA1234567890');

      expect(result).toMatchObject({
        status: 'delivered',
        carrier: 'UPS',
        status_detail: expect.any(String),
        tracking_details: expect.any(Array),
      });
    });

    it('should handle tracking failures', async () => {
      mockRequest.mockResolvedValueOnce({
        statusCode: 404,
        body: {
          json: () =>
            Promise.resolve({
              error: {
                message: 'Tracking number not found',
                code: 'TRACKING.NOT_FOUND',
              },
            }),
        },
      });

      await expect(client.trackShipment('INVALID123')).rejects.toThrow('Tracking number not found');
    });
  });

  describe('error handling', () => {
    it('should handle network timeouts', async () => {
      mockRequest.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(
        client.getRates(mockEasyPostAddress, mockEasyPostAddress, mockEasyPostParcel)
      ).rejects.toThrow('Request timeout');
    });

    it('should handle rate limiting', async () => {
      mockRequest.mockResolvedValueOnce({
        statusCode: 429,
        headers: {
          'retry-after': '60',
        },
        body: {
          json: () =>
            Promise.resolve({
              error: {
                message: 'Rate limit exceeded',
                code: 'RATE_LIMIT.EXCEEDED',
              },
            }),
        },
      });

      await expect(
        client.getRates(mockEasyPostAddress, mockEasyPostAddress, mockEasyPostParcel)
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('input validation', () => {
    it('should validate required address fields', () => {
      const invalidAddresses = [
        { ...mockEasyPostAddress, name: '' },
        { ...mockEasyPostAddress, street1: '' },
        { ...mockEasyPostAddress, city: '' },
        { ...mockEasyPostAddress, state: '' },
        { ...mockEasyPostAddress, zip: '' },
      ];

      invalidAddresses.forEach((address) => {
        expect(() => client.validateAddress(address)).toThrow();
      });
    });

    it('should validate parcel dimensions', () => {
      const invalidParcels = [
        { ...mockEasyPostParcel, length: 0 },
        { ...mockEasyPostParcel, width: -1 },
        { ...mockEasyPostParcel, height: 0 },
        { ...mockEasyPostParcel, weight: 0 },
      ];

      invalidParcels.forEach((parcel) => {
        expect(() => client.validateParcel(parcel)).toThrow();
      });
    });
  });
});
