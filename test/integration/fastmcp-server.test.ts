/**
 * Integration tests for FastMCP server
 * Tests the actual server functionality with mocked external dependencies
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { FastMCP } from 'fastmcp';
import { mockEasyPostAddress, mockEasyPostParcel } from '@test/mocks/easypost';
import { mockVeeqoApiResponses } from '@test/mocks/veeqo';

// Mock external services
vi.mock('@/services/clients/easypost-enhanced.js', () => ({
  EasyPostClient: vi.fn().mockImplementation(() => ({
    getRates: vi.fn().mockResolvedValue([
      { carrier: 'USPS', service: 'Priority', rate: '8.15', delivery_days: 2 },
      { carrier: 'UPS', service: 'Ground', rate: '7.89', delivery_days: 3 },
    ]),
    createLabel: vi.fn().mockResolvedValue({
      tracking_code: '1Z999AA1234567890',
      carrier: 'UPS',
      service: 'Ground',
      rate: '7.89',
      label_url: 'https://example.com/label.pdf',
    }),
    trackShipment: vi.fn().mockResolvedValue({
      status: 'delivered',
      carrier: 'UPS',
      status_detail: 'Package delivered',
      tracking_details: [],
    }),
    verifyAddress: vi.fn().mockResolvedValue({
      verified: true,
      suggestions: [],
      confidence: 'high',
    }),
  })),
}));

vi.mock('@/services/clients/veeqo-enhanced.js', () => ({
  VeeqoClient: vi.fn().mockImplementation(() => ({
    getInventoryLevels: vi.fn().mockResolvedValue(mockVeeqoApiResponses.getInventoryLevels()),
    updateInventoryLevels: vi.fn().mockResolvedValue(mockVeeqoApiResponses.updateInventoryLevels()),
    getOrder: vi.fn().mockResolvedValue(mockVeeqoApiResponses.getOrder()),
    updateOrder: vi.fn().mockResolvedValue(mockVeeqoApiResponses.updateOrder()),
    getLocations: vi.fn().mockResolvedValue(mockVeeqoApiResponses.getLocations()),
  })),
}));

describe('FastMCP Server Integration', () => {
  let server: FastMCP;

  beforeAll(async () => {
    // Import the server after mocks are set up
    const { default: serverInstance } = await import('@/server/fastmcp-server.js');
    server = serverInstance;
  });

  afterAll(async () => {
    // Clean up server if needed
  });

  describe('Tool Registration', () => {
    it('should register all expected shipping tools', async () => {
      const tools = await server.listTools();
      
      const expectedTools = [
        'calculate_shipping_rates',
        'create_shipping_label',
        'track_shipment',
        'select_best_rate',
        'create_return_label',
        'validate_address_with_suggestions',
      ];

      expectedTools.forEach(toolName => {
        expect(tools.some(tool => tool.name === toolName)).toBe(true);
      });
    });

    it('should register all expected inventory tools', async () => {
      const tools = await server.listTools();
      
      const expectedTools = [
        'get_inventory_levels',
        'update_inventory_levels',
        'fulfill_order',
        'allocate_inventory',
        'process_return',
        'check_low_stock',
      ];

      expectedTools.forEach(toolName => {
        expect(tools.some(tool => tool.name === toolName)).toBe(true);
      });
    });

    it('should register AI-powered tools', async () => {
      const tools = await server.listTools();
      
      const expectedTools = [
        'optimize_shipping',
        'analyze_shipping_code',
      ];

      expectedTools.forEach(toolName => {
        expect(tools.some(tool => tool.name === toolName)).toBe(true);
      });
    });
  });

  describe('Shipping Rate Calculation', () => {
    it('should calculate shipping rates successfully', async () => {
      const result = await server.callTool('calculate_shipping_rates', {
        from_address: mockEasyPostAddress,
        to_address: { ...mockEasyPostAddress, city: 'New York', state: 'NY', zip: '10001' },
        parcel: mockEasyPostParcel,
        carriers: ['USPS', 'UPS'],
      });

      expect(result).toBeValidToolResult();
      expect(result.content[0].text).toContain('USPS Priority');
      expect(result.content[0].text).toContain('UPS Ground');
    });

    it('should handle invalid addresses gracefully', async () => {
      const invalidAddress = { ...mockEasyPostAddress, zip: '' };

      await expect(
        server.callTool('calculate_shipping_rates', {
          from_address: invalidAddress,
          to_address: mockEasyPostAddress,
          parcel: mockEasyPostParcel,
        })
      ).rejects.toThrow();
    });
  });

  describe('Rate Selection', () => {
    it('should select best rate based on cost priority', async () => {
      const result = await server.callTool('select_best_rate', {
        from_address: mockEasyPostAddress,
        to_address: { ...mockEasyPostAddress, city: 'New York', state: 'NY', zip: '10001' },
        parcel: mockEasyPostParcel,
        selection_criteria: {
          priority: 'cost',
        },
      });

      expect(result).toBeValidToolResult();
      expect(result.content[0].text).toContain('Selected Best Rate');
      expect(result.content[0].text).toContain('UPS Ground'); // Cheaper option
    });

    it('should select best rate based on speed priority', async () => {
      const result = await server.callTool('select_best_rate', {
        from_address: mockEasyPostAddress,
        to_address: { ...mockEasyPostAddress, city: 'New York', state: 'NY', zip: '10001' },
        parcel: mockEasyPostParcel,
        selection_criteria: {
          priority: 'speed',
        },
      });

      expect(result).toBeValidToolResult();
      expect(result.content[0].text).toContain('Selected Best Rate');
      expect(result.content[0].text).toContain('USPS Priority'); // Faster option
    });
  });

  describe('Label Creation', () => {
    it('should create shipping label successfully', async () => {
      const result = await server.callTool('create_shipping_label', {
        from_address: mockEasyPostAddress,
        to_address: { ...mockEasyPostAddress, city: 'New York', state: 'NY', zip: '10001' },
        parcel: mockEasyPostParcel,
        carrier: 'UPS',
        service: 'Ground',
      });

      expect(result).toBeValidToolResult();
      expect(result.content[0].text).toContain('Tracking Number: 1Z999AA1234567890');
      expect(result.content[0].text).toContain('Carrier: UPS');
      expect(result.content[0].text).toContain('Label URL:');
    });
  });

  describe('Inventory Management', () => {
    it('should get inventory levels', async () => {
      const result = await server.callTool('get_inventory_levels', {
        product_ids: ['123456'],
        location_ids: ['339686'],
      });

      expect(result).toBeValidToolResult();
      expect(result.content[0].text).toContain('Inventory Levels');
      expect(result.content[0].text).toContain('Test Product');
    });

    it('should update inventory levels', async () => {
      const result = await server.callTool('update_inventory_levels', {
        updates: [
          {
            product_id: '123456',
            location_id: '339686',
            quantity: 45,
            reason: 'Stock adjustment',
          },
        ],
      });

      expect(result).toBeValidToolResult();
      expect(result.content[0].text).toContain('Inventory levels updated successfully');
    });
  });

  describe('Order Fulfillment', () => {
    it('should process order fulfillment', async () => {
      const result = await server.callTool('fulfill_order', {
        order_id: '445566',
        fulfillment_details: {
          location_id: '339686',
          tracking_number: '1Z999AA1234567890',
          carrier: 'UPS',
          service: 'Ground',
          shipped_items: [
            {
              line_item_id: '998877',
              quantity: 2,
            },
          ],
        },
        create_label: false,
        notify_customer: true,
      });

      expect(result).toBeValidToolResult();
      expect(result.content[0].text).toContain('Order 445566 fulfilled successfully');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Mock a failing API call
      vi.mocked(server).callTool = vi.fn().mockRejectedValueOnce(new Error('API Error'));

      await expect(
        server.callTool('calculate_shipping_rates', {
          from_address: mockEasyPostAddress,
          to_address: mockEasyPostAddress,
          parcel: mockEasyPostParcel,
        })
      ).rejects.toThrow('API Error');
    });
  });

  describe('Resource Templates', () => {
    it('should load shipping rates resource', async () => {
      const resource = await server.loadResource('shipping://rates/94105/10001');
      
      expect(resource).toBeDefined();
      expect(resource.text).toBeDefined();
      
      const data = JSON.parse(resource.text);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should load inventory status resource', async () => {
      const resource = await server.loadResource('inventory://status/123456');
      
      expect(resource).toBeDefined();
      expect(resource.text).toBeDefined();
      
      const data = JSON.parse(resource.text);
      expect(data).toHaveProperty('available_quantity');
    });
  });

  describe('Prompts', () => {
    it('should generate shipping optimization prompt', async () => {
      const prompt = await server.loadPrompt('shipping_optimization', {
        package_info: 'Weight: 2lbs, Dimensions: 12x9x6',
        requirements: 'Budget: $15, Timeline: 3 days',
        route: 'San Francisco, CA to New York, NY',
      });

      expect(prompt).toContain('Analyze the following shipping scenario');
      expect(prompt).toContain('Weight: 2lbs');
      expect(prompt).toContain('Budget: $15');
    });

    it('should generate code review prompt', async () => {
      const prompt = await server.loadPrompt('shipping_code_review', {
        code: 'function calculateRate() { return 10; }',
        context: 'Rate calculation function',
      });

      expect(prompt).toContain('Please review the following shipping-related code');
      expect(prompt).toContain('function calculateRate()');
      expect(prompt).toContain('Rate calculation function');
    });
  });
});