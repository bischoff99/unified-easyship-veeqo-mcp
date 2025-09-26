/**
 * Simplified Inventory Tools Module
 * Optimized for TypeScript language service stability
 */

import { z } from "zod";
import type { FastMCP } from "fastmcp";
import { VeeqoClient } from "../../services/clients/veeqo-enhanced.js";
import {
  safeLogger as logger,
  safeMonitoring as monitoring,
} from "../../utils/type-safe-logger.js";

const logError = (message: string, error: any) => {
  logger.error(message, error);
};

export function addInventoryTools(server: FastMCP, veeqoClient: VeeqoClient) {
  // 1. Unified product management tool
  server.addTool({
    name: "product_management",
    description: "Unified product management: get, create, update, delete products",
    parameters: z.object({
      operation: z.enum(["get", "create", "update", "delete", "list"]),
      product_id: z.string().optional(),
      product_data: z.object({
        name: z.string().optional(),
        sku: z.string().optional(),
        price: z.number().optional(),
        description: z.string().optional(),
      }).optional(),
      page: z.number().min(1).default(1).optional(),
      per_page: z.number().min(1).max(100).default(25).optional(),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info("Executing product operation", { operation: args.operation });

        switch (args.operation) {
          case "get":
            if (!args.product_id) throw new Error("Product ID required for get operation");
            return await veeqoClient.getProduct(args.product_id);
          
          case "create":
            if (!args.product_data) throw new Error("Product data required for create operation");
            return await veeqoClient.createProduct(args.product_data);
          
          case "update":
            if (!args.product_id || !args.product_data) {
              throw new Error("Product ID and data required for update operation");
            }
            return await veeqoClient.updateProduct(args.product_id, args.product_data);
          
          case "delete":
            if (!args.product_id) throw new Error("Product ID required for delete operation");
            return await veeqoClient.deleteProduct(args.product_id);
          
          case "list":
            return await veeqoClient.getProducts(args.per_page || 25, args.page || 1);
          
          default:
            throw new Error(`Unknown operation: ${args.operation}`);
        }
      } catch (error) {
        logError("Product operation failed", error);
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        monitoring.recordMetric("product_operation_duration", duration);
      }
    },
  });

  // 2. Inventory level management tool
  server.addTool({
    name: "inventory_management",
    description: "Manage inventory levels and stock movements",
    parameters: z.object({
      operation: z.enum(["get_levels", "update_level", "get_movements"]),
      product_id: z.string().optional(),
      warehouse_id: z.string().optional(),
      quantity: z.number().optional(),
      movement_type: z.enum(["in", "out", "adjustment"]).optional(),
    }),
    execute: async (args) => {
      try {
        switch (args.operation) {
          case "get_levels":
            if (!args.product_id) throw new Error("Product ID required");
            return await veeqoClient.getInventoryLevels(args.product_id);
          
          case "update_level":
            if (!args.product_id || !args.warehouse_id || args.quantity === undefined) {
              throw new Error("Product ID, warehouse ID, and quantity required");
            }
            return await veeqoClient.updateInventoryLevel(args.product_id, args.warehouse_id, args.quantity);
          
          case "get_movements":
            return await veeqoClient.getStockMovements(args.product_id);
          
          default:
            throw new Error(`Unknown operation: ${args.operation}`);
        }
      } catch (error) {
        logError("Inventory operation failed", error);
        throw error;
      }
    },
  });

  // 3. Order management tool
  server.addTool({
    name: "order_management",
    description: "Manage orders: get, create, update, fulfill",
    parameters: z.object({
      operation: z.enum(["get", "create", "update", "fulfill", "list"]),
      order_id: z.string().optional(),
      order_data: z.object({
        customer_id: z.string().optional(),
        items: z.array(z.object({
          product_id: z.string(),
          quantity: z.number(),
          price: z.number(),
        })).optional(),
        status: z.string().optional(),
      }).optional(),
      page: z.number().min(1).default(1).optional(),
    }),
    execute: async (args) => {
      try {
        switch (args.operation) {
          case "get":
            if (!args.order_id) throw new Error("Order ID required");
            return await veeqoClient.getOrder(args.order_id);
          
          case "create":
            if (!args.order_data) throw new Error("Order data required");
            return await veeqoClient.createOrder(args.order_data);
          
          case "update":
            if (!args.order_id || !args.order_data) {
              throw new Error("Order ID and data required");
            }
            return await veeqoClient.updateOrder(args.order_id, args.order_data);
          
          case "fulfill":
            if (!args.order_id) throw new Error("Order ID required");
            return await veeqoClient.fulfillOrder(args.order_id);
          
          case "list":
            return await veeqoClient.getOrders(args.page || 1);
          
          default:
            throw new Error(`Unknown operation: ${args.operation}`);
        }
      } catch (error) {
        logError("Order operation failed", error);
        throw error;
      }
    },
  });

  // 4. Warehouse management tool
  server.addTool({
    name: "warehouse_management",
    description: "Manage warehouses and locations",
    parameters: z.object({
      operation: z.enum(["get", "create", "update", "delete", "list"]),
      warehouse_id: z.string().optional(),
      warehouse_data: z.object({
        name: z.string().optional(),
        address: z.string().optional(),
        is_active: z.boolean().optional(),
      }).optional(),
    }),
    execute: async (args) => {
      try {
        switch (args.operation) {
          case "get":
            if (!args.warehouse_id) throw new Error("Warehouse ID required");
            return await veeqoClient.getWarehouse(args.warehouse_id);
          
          case "create":
            if (!args.warehouse_data) throw new Error("Warehouse data required");
            return await veeqoClient.createWarehouse(args.warehouse_data);
          
          case "update":
            if (!args.warehouse_id || !args.warehouse_data) {
              throw new Error("Warehouse ID and data required");
            }
            return await veeqoClient.updateWarehouse(args.warehouse_id, args.warehouse_data);
          
          case "delete":
            if (!args.warehouse_id) throw new Error("Warehouse ID required");
            return await veeqoClient.deleteWarehouse(args.warehouse_id);
          
          case "list":
            return await veeqoClient.getWarehouses();
          
          default:
            throw new Error(`Unknown operation: ${args.operation}`);
        }
      } catch (error) {
        logError("Warehouse operation failed", error);
        throw error;
      }
    },
  });

  // 5. Customer management tool
  server.addTool({
    name: "customer_management",
    description: "Manage customers: get, create, update, delete",
    parameters: z.object({
      operation: z.enum(["get", "create", "update", "delete", "list"]),
      customer_id: z.string().optional(),
      customer_data: z.object({
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
      }).optional(),
      page: z.number().min(1).default(1).optional(),
    }),
    execute: async (args) => {
      try {
        switch (args.operation) {
          case "get":
            if (!args.customer_id) throw new Error("Customer ID required");
            return await veeqoClient.getCustomer(args.customer_id);
          
          case "create":
            if (!args.customer_data) throw new Error("Customer data required");
            return await veeqoClient.createCustomer(args.customer_data);
          
          case "update":
            if (!args.customer_id || !args.customer_data) {
              throw new Error("Customer ID and data required");
            }
            return await veeqoClient.updateCustomer(args.customer_id, args.customer_data);
          
          case "delete":
            if (!args.customer_id) throw new Error("Customer ID required");
            return await veeqoClient.deleteCustomer(args.customer_id);
          
          case "list":
            return await veeqoClient.getCustomers(args.page || 1);
          
          default:
            throw new Error(`Unknown operation: ${args.operation}`);
        }
      } catch (error) {
        logError("Customer operation failed", error);
        throw error;
      }
    },
  });

  // 6. Supplier management tool
  server.addTool({
    name: "supplier_management",
    description: "Manage suppliers: get, create, update, delete",
    parameters: z.object({
      operation: z.enum(["get", "create", "update", "delete", "list"]),
      supplier_id: z.string().optional(),
      supplier_data: z.object({
        name: z.string().optional(),
        contact_email: z.string().optional(),
        contact_phone: z.string().optional(),
      }).optional(),
    }),
    execute: async (args) => {
      try {
        switch (args.operation) {
          case "get":
            if (!args.supplier_id) throw new Error("Supplier ID required");
            return await veeqoClient.getSupplier(args.supplier_id);
          
          case "create":
            if (!args.supplier_data) throw new Error("Supplier data required");
            return await veeqoClient.createSupplier(args.supplier_data);
          
          case "update":
            if (!args.supplier_id || !args.supplier_data) {
              throw new Error("Supplier ID and data required");
            }
            return await veeqoClient.updateSupplier(args.supplier_id, args.supplier_data);
          
          case "delete":
            if (!args.supplier_id) throw new Error("Supplier ID required");
            return await veeqoClient.deleteSupplier(args.supplier_id);
          
          case "list":
            return await veeqoClient.getSuppliers();
          
          default:
            throw new Error(`Unknown operation: ${args.operation}`);
        }
      } catch (error) {
        logError("Supplier operation failed", error);
        throw error;
      }
    },
  });

  // 7. Purchase order management tool
  server.addTool({
    name: "purchase_order_management",
    description: "Manage purchase orders: get, create, update, delete",
    parameters: z.object({
      operation: z.enum(["get", "create", "update", "delete", "list"]),
      purchase_order_id: z.string().optional(),
      purchase_order_data: z.object({
        supplier_id: z.string().optional(),
        items: z.array(z.object({
          product_id: z.string(),
          quantity: z.number(),
          unit_cost: z.number(),
        })).optional(),
        status: z.string().optional(),
      }).optional(),
    }),
    execute: async (args) => {
      try {
        switch (args.operation) {
          case "get":
            if (!args.purchase_order_id) throw new Error("Purchase order ID required");
            return await veeqoClient.getPurchaseOrder(args.purchase_order_id);
          
          case "create":
            if (!args.purchase_order_data) throw new Error("Purchase order data required");
            return await veeqoClient.createPurchaseOrder(args.purchase_order_data);
          
          case "update":
            if (!args.purchase_order_id || !args.purchase_order_data) {
              throw new Error("Purchase order ID and data required");
            }
            return await veeqoClient.updatePurchaseOrder(args.purchase_order_id, args.purchase_order_data);
          
          case "delete":
            if (!args.purchase_order_id) throw new Error("Purchase order ID required");
            return await veeqoClient.deletePurchaseOrder(args.purchase_order_id);
          
          case "list":
            return await veeqoClient.getPurchaseOrders();
          
          default:
            throw new Error(`Unknown operation: ${args.operation}`);
        }
      } catch (error) {
        logError("Purchase order operation failed", error);
        throw error;
      }
    },
  });

  // 8. Reporting tool
  server.addTool({
    name: "inventory_reporting",
    description: "Generate inventory reports and analytics",
    parameters: z.object({
      report_type: z.enum(["stock_levels", "movements", "products", "orders"]),
      date_from: z.string().optional(),
      date_to: z.string().optional(),
      warehouse_id: z.string().optional(),
    }),
    execute: async (args) => {
      try {
        // Simple reporting logic
        const report = {
          type: args.report_type,
          generated_at: new Date().toISOString(),
          filters: {
            date_from: args.date_from,
            date_to: args.date_to,
            warehouse_id: args.warehouse_id,
          },
          data: "Report data would be generated here",
        };

        return report;
      } catch (error) {
        logError("Reporting operation failed", error);
        throw error;
      }
    },
  });
}
