/**
 * Mock data and utilities for Veeqo API testing
 */

export const mockVeeqoProduct = {
  id: 123456,
  title: "Test Product",
  sku: "TEST-SKU-001",
  description: "A test product for unit testing",
  weight: 1.5,
  dimensions: {
    length: 10,
    width: 8,
    height: 6,
  },
  price: 29.99,
  cost_price: 15.0,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-13T12:00:00Z",
};

export const mockVeeqoInventoryItem = {
  id: 789012,
  product_id: 123456,
  product_name: "Test Product",
  sku: "TEST-SKU-001",
  location_id: 339686,
  location_name: "Main Warehouse",
  available_quantity: 50,
  allocated_quantity: 5,
  incoming_quantity: 0,
  reserved_quantity: 2,
  physical_quantity: 55,
  sellable_quantity: 48,
  last_updated: "2024-01-13T12:00:00Z",
};

export const mockVeeqoOrder = {
  id: 445566,
  order_number: "ORD-2024-001",
  status: "awaiting_fulfillment",
  channel: {
    id: 12345,
    name: "Test Store",
  },
  customer: {
    id: 778899,
    first_name: "Jane",
    last_name: "Smith",
    email: "jane.smith@test.com",
    phone: "555-9876",
  },
  delivery_method: {
    id: 334455,
    name: "Standard Shipping",
    price: 5.99,
  },
  line_items: [
    {
      id: 998877,
      product_id: 123456,
      sku: "TEST-SKU-001",
      quantity: 2,
      price_per_unit: 29.99,
      total_price: 59.98,
      product_title: "Test Product",
      product_options: [],
    },
  ],
  shipping_address: {
    id: 556677,
    first_name: "Jane",
    last_name: "Smith",
    address1: "456 Oak Avenue",
    address2: "Apt 2B",
    city: "Los Angeles",
    state: "CA",
    zip: "90210",
    country: "US",
    phone: "555-9876",
  },
  billing_address: {
    id: 556678,
    first_name: "Jane",
    last_name: "Smith",
    address1: "456 Oak Avenue",
    address2: "Apt 2B",
    city: "Los Angeles",
    state: "CA",
    zip: "90210",
    country: "US",
    phone: "555-9876",
  },
  subtotal: 59.98,
  shipping_cost: 5.99,
  tax: 5.4,
  total: 71.37,
  currency: "USD",
  created_at: "2024-01-13T10:00:00Z",
  updated_at: "2024-01-13T12:00:00Z",
};

export const mockVeeqoLocation = {
  id: 339686,
  name: "Main Warehouse",
  address: {
    address1: "123 Warehouse Blvd",
    address2: null,
    city: "San Francisco",
    state: "CA",
    zip: "94107",
    country: "US",
  },
  contact: {
    name: "Warehouse Manager",
    email: "warehouse@test.com",
    phone: "555-0001",
  },
  is_default: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

export const mockInventoryUpdate = {
  product_id: 123456,
  location_id: 339686,
  old_quantity: 50,
  new_quantity: 48,
  adjustment: -2,
  reason: "Order fulfillment",
  updated_at: "2024-01-13T12:00:00Z",
  updated_by: "test-user",
};

export const mockFulfillment = {
  id: 112233,
  order_id: 445566,
  location_id: 339686,
  tracking_number: "1Z999AA1234567890",
  carrier: "UPS",
  service: "Ground",
  line_items: [
    {
      line_item_id: 998877,
      quantity: 2,
      fulfilled: true,
    },
  ],
  status: "fulfilled",
  created_at: "2024-01-13T12:00:00Z",
  updated_at: "2024-01-13T12:00:00Z",
};

export const mockVeeqoApiResponses = {
  getProduct: () => mockVeeqoProduct,
  getOrder: () => mockVeeqoOrder,
  getInventoryLevels: () => [mockVeeqoInventoryItem],
  getLocations: () => [mockVeeqoLocation],
  updateInventoryLevels: () => [mockInventoryUpdate],
  updateOrder: () => ({ ...mockVeeqoOrder, status: "fulfilled" }),
  fulfillOrder: () => mockFulfillment,
};
