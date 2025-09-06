/**
 * Enhanced Veeqo Client Implementation
 *
 * Based on Veeqo API research, this client provides comprehensive
 * integration with Veeqo's inventory and order management services.
 */

import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export interface VeeqoProduct {
  id: number;
  title: string;
  sku: string;
  barcode?: string;
  description?: string;
  price: number;
  cost_price?: number;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  created_at: string;
  updated_at: string;
  variants?: VeeqoVariant[];
}

export interface VeeqoVariant {
  id: number;
  product_id: number;
  title: string;
  sku: string;
  barcode?: string;
  price: number;
  cost_price?: number;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  created_at: string;
  updated_at: string;
}

export interface VeeqoInventoryLevel {
  id: number;
  product_id: number;
  variant_id: number;
  location_id: number;
  available_quantity: number;
  reserved_quantity: number;
  total_quantity: number;
  on_hand_quantity: number;
  incoming_quantity: number;
  product_name: string;
  variant_title: string;
  location_name: string;
  sku: string;
  created_at: string;
  updated_at: string;
}

export interface VeeqoOrder {
  id: number;
  order_number: string;
  status: string;
  total_price: number;
  currency: string;
  customer: VeeqoCustomer;
  shipping_address: VeeqoAddress;
  billing_address: VeeqoAddress;
  line_items: VeeqoLineItem[];
  created_at: string;
  updated_at: string;
  shipped_at?: string;
  tracking_number?: string;
  carrier?: string;
  service?: string;
}

export interface VeeqoCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  company?: string;
  created_at: string;
  updated_at: string;
}

export interface VeeqoAddress {
  first_name: string;
  last_name: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
}

export interface VeeqoLineItem {
  id: number;
  product_id: number;
  variant_id: number;
  title: string;
  sku: string;
  quantity: number;
  price: number;
  total_price: number;
  allocated_quantity?: number;
  shipped_quantity?: number;
}

export interface VeeqoLocation {
  id: number;
  name: string;
  address: VeeqoAddress;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface VeeqoInventoryUpdate {
  product_id: number;
  location_id: number;
  quantity: number;
  reason?: string;
}

export interface VeeqoInventoryUpdateResult {
  product_id: number;
  location_id: number;
  old_quantity: number;
  new_quantity: number;
  success: boolean;
  error?: string;
}

export class VeeqoClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly mockMode: boolean;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || config.veeqo.apiKey;
    this.baseUrl = config.veeqo.baseUrl;
    this.timeout = config.veeqo.timeout;
    this.mockMode = config.veeqo.mockMode;

    // Validate API key
    if (!this.apiKey || this.apiKey.trim() === '') {
      throw new Error('VEEQO_API_KEY is required');
    }

    if (this.mockMode) {
      logger.info('Veeqo client initialized in mock mode');
    } else {
      logger.info('Veeqo client initialized with API key');
    }
  }

  /**
   * Get inventory levels for products
   */
  async getInventoryLevels(
    productIds?: string[],
    locationIds?: string[],
  ): Promise<VeeqoInventoryLevel[]> {
    if (this.mockMode) {
      return this.getMockInventoryLevels(productIds, locationIds);
    }

    try {
      // Veeqo includes inventory data in the products endpoint
      const params = new URLSearchParams();
      params.append('include', 'inventory');

      if (productIds) {
        params.append('product_ids', productIds.join(','));
      }

      const response = await this.makeRequest('GET', `/products?${params}`);
      const products = response.products || response;

      // Extract inventory levels from products
      const inventoryLevels: VeeqoInventoryLevel[] = [];

      for (const product of products) {
        if (product.inventory && Array.isArray(product.inventory)) {
          for (const inventory of product.inventory) {
            // Filter by location if specified
            if (!locationIds || locationIds.includes(inventory.location_id.toString())) {
              inventoryLevels.push({
                id: inventory.id || `${product.id}_${inventory.location_id}`,
                product_id: product.id,
                variant_id: inventory.variant_id || product.id,
                location_id: inventory.location_id,
                available_quantity: inventory.available_quantity || inventory.quantity || 0,
                reserved_quantity: inventory.reserved_quantity || 0,
                total_quantity: inventory.quantity || 0,
                on_hand_quantity: inventory.quantity || 0,
                incoming_quantity: 0,
                product_name: product.title || '',
                variant_title: product.title || '',
                location_name: `Location ${inventory.location_id}`,
                sku: product.sku || '',
                created_at: inventory.created_at || new Date().toISOString(),
                updated_at: inventory.updated_at || new Date().toISOString(),
              });
            }
          }
        }
      }

      logger.info(
        {
          count: inventoryLevels.length,
          productIds: productIds?.length || 'all',
          locationIds: locationIds?.length || 'all',
        },
        'Inventory levels retrieved successfully',
      );

      return inventoryLevels;
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to get inventory levels');
      throw error;
    }
  }

  /**
   * Get inventory for a specific product
   */
  async getProductInventory(productId: string): Promise<VeeqoInventoryLevel[]> {
    return this.getInventoryLevels([productId]);
  }

  /**
   * Update inventory levels
   */
  async updateInventoryLevels(
    updates: VeeqoInventoryUpdate[],
  ): Promise<VeeqoInventoryUpdateResult[]> {
    if (this.mockMode) {
      return this.getMockInventoryUpdateResults(updates);
    }

    try {
      const results: VeeqoInventoryUpdateResult[] = [];

      for (const update of updates) {
        try {
          const response = await this.makeRequest('POST', '/inventory_levels', {
            inventory_level: {
              product_id: update.product_id,
              location_id: update.location_id,
              quantity: update.quantity,
              reason: update.reason || 'API Update',
            },
          });

          results.push({
            product_id: update.product_id,
            location_id: update.location_id,
            old_quantity: response.old_quantity || 0,
            new_quantity: response.quantity,
            success: true,
          });
        } catch (error) {
          results.push({
            product_id: update.product_id,
            location_id: update.location_id,
            old_quantity: 0,
            new_quantity: 0,
            success: false,
            error: (error as Error).message,
          });
        }
      }

      logger.info(
        {
          total: updates.length,
          successful: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
        },
        'Inventory levels updated',
      );

      return results;
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to update inventory levels');
      throw error;
    }
  }

  /**
   * Get all products
   */
  async getProducts(limit: number = 100, page: number = 1): Promise<VeeqoProduct[]> {
    if (this.mockMode) {
      return this.getMockProducts();
    }

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        page: page.toString(),
      });

      const response = await this.makeRequest('GET', `/products?${params}`);
      const products = response.products || response;

      logger.info(
        {
          count: products.length,
          page,
          limit,
        },
        'Products retrieved successfully',
      );

      return products;
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to get products');
      throw error;
    }
  }

  /**
   * Get a specific product by ID
   */
  async getProduct(productId: string): Promise<VeeqoProduct> {
    if (this.mockMode) {
      return this.getMockProduct(productId);
    }

    try {
      const response = await this.makeRequest('GET', `/products/${productId}`);

      logger.info({ productId }, 'Product retrieved successfully');
      return response;
    } catch (error) {
      logger.error({ error: (error as Error).message, productId }, 'Failed to get product');
      throw error;
    }
  }

  /**
   * Get all orders
   */
  async getOrders(limit: number = 100, page: number = 1, status?: string): Promise<VeeqoOrder[]> {
    if (this.mockMode) {
      return this.getMockOrders();
    }

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        page: page.toString(),
      });

      if (status) {
        params.append('status', status);
      }

      const response = await this.makeRequest('GET', `/orders?${params}`);
      const orders = response.orders || response;

      logger.info(
        {
          count: orders.length,
          page,
          limit,
          status,
        },
        'Orders retrieved successfully',
      );

      return orders;
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to get orders');
      throw error;
    }
  }

  /**
   * Get a specific order by ID
   */
  async getOrder(orderId: string): Promise<VeeqoOrder> {
    if (this.mockMode) {
      return this.getMockOrder(orderId);
    }

    try {
      const response = await this.makeRequest('GET', `/orders/${orderId}`);

      logger.info({ orderId }, 'Order retrieved successfully');
      return response;
    } catch (error) {
      logger.error({ error: (error as Error).message, orderId }, 'Failed to get order');
      throw error;
    }
  }

  /**
   * Get customers
   */
  async getCustomers(limit: number = 100, page: number = 1): Promise<any[]> {
    if (this.mockMode) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        page: page.toString(),
      });

      const response = await this.makeRequest('GET', `/customers?${params}`);
      const customers = response.customers || response;

      logger.info({ count: customers.length }, 'Customers retrieved successfully');
      return customers;
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to get customers');
      throw error;
    }
  }

  /**
   * Get suppliers
   */
  async getSuppliers(limit: number = 100, page: number = 1): Promise<any[]> {
    if (this.mockMode) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        page: page.toString(),
      });

      const response = await this.makeRequest('GET', `/suppliers?${params}`);
      const suppliers = response.suppliers || response;

      logger.info({ count: suppliers.length }, 'Suppliers retrieved successfully');
      return suppliers;
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to get suppliers');
      throw error;
    }
  }

  /**
   * Get carriers
   */
  async getCarriers(): Promise<any[]> {
    if (this.mockMode) {
      return [];
    }

    try {
      const response = await this.makeRequest('GET', '/carriers');
      const carriers = response.carriers || response;

      logger.info({ count: carriers.length }, 'Carriers retrieved successfully');
      return carriers;
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to get carriers');
      throw error;
    }
  }

  /**
   * Get channels
   */
  async getChannels(): Promise<any[]> {
    if (this.mockMode) {
      return [];
    }

    try {
      const response = await this.makeRequest('GET', '/channels');
      const channels = response.channels || response;

      logger.info({ count: channels.length }, 'Channels retrieved successfully');
      return channels;
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to get channels');
      throw error;
    }
  }

  /**
   * Get all locations
   */
  async getLocations(): Promise<VeeqoLocation[]> {
    if (this.mockMode) {
      return this.getMockLocations();
    }

    try {
      const response = await this.makeRequest('GET', '/locations');
      const locations = response.locations || response;

      logger.info({ count: locations.length }, 'Locations retrieved successfully');
      return locations;
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to get locations');
      throw error;
    }
  }

  /**
   * Create a new order
   */
  async createOrder(orderData: Partial<VeeqoOrder>): Promise<VeeqoOrder> {
    if (this.mockMode) {
      return this.getMockOrder('new');
    }

    try {
      const response = await this.makeRequest('POST', '/orders', {
        order: orderData,
      });

      logger.info({ orderId: response.id }, 'Order created successfully');
      return response;
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to create order');
      throw error;
    }
  }

  /**
   * Update an order
   */
  async updateOrder(orderId: string, orderData: Partial<VeeqoOrder>): Promise<VeeqoOrder> {
    if (this.mockMode) {
      return this.getMockOrder(orderId);
    }

    try {
      const response = await this.makeRequest('PUT', `/orders/${orderId}`, {
        order: orderData,
      });

      logger.info({ orderId }, 'Order updated successfully');
      return response;
    } catch (error) {
      logger.error({ error: (error as Error).message, orderId }, 'Failed to update order');
      throw error;
    }
  }

  /**
   * Get demand forecast data
   */
  async getDemandForecast(locationId?: string, days: number = 30): Promise<any[]> {
    if (this.mockMode) {
      return this.getMockDemandForecast();
    }

    try {
      const params = new URLSearchParams({
        days: days.toString(),
      });

      if (locationId) {
        params.append('location_id', locationId);
      }

      const response = await this.makeRequest('GET', `/demand_forecast?${params}`);

      logger.info(
        {
          count: response.length,
          locationId,
          days,
        },
        'Demand forecast retrieved successfully',
      );

      return response;
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to get demand forecast');
      throw error;
    }
  }

  /**
   * Make HTTP request to Veeqo API
   */
  private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'Unified-EasyPost-Veeqo-MCP/1.0.0',
    };

    const options: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Veeqo API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
        );
      }

      return await response.json();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error('Veeqo API request timeout');
      }
      throw error;
    }
  }

  /**
   * Mock data for testing
   */
  private getMockInventoryLevels(
    productIds?: string[],
    locationIds?: string[],
  ): VeeqoInventoryLevel[] {
    const mockData: VeeqoInventoryLevel[] = [
      {
        id: 1,
        product_id: 101,
        variant_id: 1001,
        location_id: 1,
        available_quantity: 50,
        reserved_quantity: 5,
        total_quantity: 55,
        on_hand_quantity: 55,
        incoming_quantity: 10,
        product_name: 'Wireless Headphones',
        variant_title: 'Black',
        location_name: 'Main Warehouse',
        sku: 'WH-BLK-001',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        product_id: 102,
        variant_id: 1002,
        location_id: 1,
        available_quantity: 25,
        reserved_quantity: 2,
        total_quantity: 27,
        on_hand_quantity: 27,
        incoming_quantity: 5,
        product_name: 'Smart Watch',
        variant_title: 'Silver',
        location_name: 'Main Warehouse',
        sku: 'SW-SLV-001',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 3,
        product_id: 101,
        variant_id: 1001,
        location_id: 2,
        available_quantity: 15,
        reserved_quantity: 0,
        total_quantity: 15,
        on_hand_quantity: 15,
        incoming_quantity: 0,
        product_name: 'Wireless Headphones',
        variant_title: 'Black',
        location_name: 'Secondary Warehouse',
        sku: 'WH-BLK-001',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    let filtered = mockData;

    if (productIds) {
      filtered = filtered.filter((item) => productIds.includes(item.product_id.toString()));
    }

    if (locationIds) {
      filtered = filtered.filter((item) => locationIds.includes(item.location_id.toString()));
    }

    return filtered;
  }

  private getMockInventoryUpdateResults(
    updates: VeeqoInventoryUpdate[],
  ): VeeqoInventoryUpdateResult[] {
    return updates.map((update) => ({
      product_id: update.product_id,
      location_id: update.location_id,
      old_quantity: Math.floor(Math.random() * 100),
      new_quantity: update.quantity,
      success: true,
    }));
  }

  private getMockProducts(): VeeqoProduct[] {
    return [
      {
        id: 101,
        title: 'Wireless Headphones',
        sku: 'WH-BLK-001',
        barcode: '123456789012',
        description: 'High-quality wireless headphones',
        price: 99.99,
        cost_price: 60.0,
        weight: 0.5,
        length: 20,
        width: 15,
        height: 8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        variants: [
          {
            id: 1001,
            product_id: 101,
            title: 'Black',
            sku: 'WH-BLK-001',
            price: 99.99,
            cost_price: 60.0,
            weight: 0.5,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      },
      {
        id: 102,
        title: 'Smart Watch',
        sku: 'SW-SLV-001',
        barcode: '123456789013',
        description: 'Advanced smart watch with health tracking',
        price: 299.99,
        cost_price: 180.0,
        weight: 0.3,
        length: 4,
        width: 4,
        height: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        variants: [
          {
            id: 1002,
            product_id: 102,
            title: 'Silver',
            sku: 'SW-SLV-001',
            price: 299.99,
            cost_price: 180.0,
            weight: 0.3,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      },
    ];
  }

  private getMockProduct(productId: string): VeeqoProduct {
    const products = this.getMockProducts();
    return products.find((p) => p.id.toString() === productId) || products[0];
  }

  private getMockOrders(): VeeqoOrder[] {
    return [
      {
        id: 1001,
        order_number: 'ORD-001',
        status: 'pending',
        total_price: 199.98,
        currency: 'USD',
        customer: {
          id: 1,
          email: 'customer@example.com',
          first_name: 'John',
          last_name: 'Doe',
          phone: '+1234567890',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        shipping_address: {
          first_name: 'John',
          last_name: 'Doe',
          address1: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US',
          phone: '+1234567890',
        },
        billing_address: {
          first_name: 'John',
          last_name: 'Doe',
          address1: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US',
          phone: '+1234567890',
        },
        line_items: [
          {
            id: 1,
            product_id: 101,
            variant_id: 1001,
            title: 'Wireless Headphones - Black',
            sku: 'WH-BLK-001',
            quantity: 2,
            price: 99.99,
            total_price: 199.98,
            allocated_quantity: 2,
            shipped_quantity: 0,
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  private getMockOrder(orderId: string): VeeqoOrder {
    const orders = this.getMockOrders();
    return orders.find((o) => o.id.toString() === orderId) || orders[0];
  }

  private getMockLocations(): VeeqoLocation[] {
    return [
      {
        id: 1,
        name: 'Main Warehouse',
        address: {
          first_name: 'Warehouse',
          last_name: 'Manager',
          address1: '100 Industrial Blvd',
          city: 'Los Angeles',
          state: 'CA',
          zip: '90210',
          country: 'US',
        },
        is_default: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Secondary Warehouse',
        address: {
          first_name: 'Warehouse',
          last_name: 'Manager',
          address1: '200 Distribution Dr',
          city: 'Chicago',
          state: 'IL',
          zip: '60601',
          country: 'US',
        },
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  private getMockDemandForecast(): any[] {
    return [
      {
        product_id: 101,
        product_name: 'Wireless Headphones',
        sku: 'WH-BLK-001',
        current_stock: 50,
        forecasted_demand: 75,
        recommended_order: 25,
        lead_time_days: 7,
        reorder_point: 20,
      },
      {
        product_id: 102,
        product_name: 'Smart Watch',
        sku: 'SW-SLV-001',
        current_stock: 25,
        forecasted_demand: 40,
        recommended_order: 15,
        lead_time_days: 10,
        reorder_point: 15,
      },
    ];
  }
}
