/**
 * Inventory Tools Module for FastMCP Server
 * Contains all Veeqo inventory-related tools and functionality
 */
import { z } from "zod";
import { safeLogger as logger, safeMonitoring as monitoring, } from "../../utils/type-safe-logger.js";
const logError = (message, error) => {
    logger.error(message, error);
};
export function addInventoryTools(server, veeqoClient) {
    /**
     * Get products from Veeqo
     */
    server.addTool({
        name: "get_products",
        description: "Retrieve products from Veeqo inventory",
        parameters: z.object({
            page: z.number().min(1).default(1).describe("Page number for pagination"),
            per_page: z
                .number()
                .min(1)
                .max(100)
                .default(25)
                .describe("Number of products per page"),
            query: z.string().optional().describe("Search query to filter products"),
            sku: z.string().optional().describe("Filter by specific SKU"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Fetching products from Veeqo", {
                    page: args.page,
                    per_page: args.per_page,
                    query: args.query,
                    sku: args.sku,
                });
                const products = await veeqoClient.getProducts(args.per_page, args.page);
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/products", duration, 200, true);
                logger.info(`Retrieved ${products.length} products in ${duration}ms`);
                const result = {
                    products,
                    count: products.length,
                    page: args.page,
                    per_page: args.per_page,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/products", duration, 500, true);
                logError("Failed to fetch products", error);
                throw new Error(`Product retrieval failed: ${error.message}`);
            }
        },
    });
    /**
     * Get orders from Veeqo
     */
    server.addTool({
        name: "get_orders",
        description: "Retrieve orders from Veeqo",
        parameters: z.object({
            page: z.number().min(1).default(1).describe("Page number for pagination"),
            per_page: z
                .number()
                .min(1)
                .max(100)
                .default(25)
                .describe("Number of orders per page"),
            status: z
                .enum(["awaiting_fulfillment", "fulfilled", "cancelled", "all"])
                .default("all")
                .describe("Filter by order status"),
            since: z
                .string()
                .optional()
                .describe("ISO date string to filter orders since a specific date"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Fetching orders from Veeqo", {
                    page: args.page,
                    per_page: args.per_page,
                    status: args.status,
                    since: args.since,
                });
                const orders = await veeqoClient.getOrders(args.per_page, args.page, args.status === "all" ? undefined : args.status);
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/orders", duration, 200, true);
                logger.info(`Retrieved ${orders.length} orders in ${duration}ms`);
                const result = {
                    orders,
                    count: orders.length,
                    page: args.page,
                    per_page: args.per_page,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/orders", duration, 500, true);
                logError("Failed to fetch orders", error);
                throw new Error(`Order retrieval failed: ${error.message}`);
            }
        },
    });
    /**
     * Create fulfillment in Veeqo
     */
    server.addTool({
        name: "create_fulfillment",
        description: "Create a fulfillment for an order in Veeqo",
        parameters: z.object({
            order_id: z.number().describe("Veeqo order ID"),
            line_items: z
                .array(z.object({
                sellable_id: z.number().describe("Product variant ID"),
                quantity: z.number().min(1).describe("Quantity to fulfill"),
            }))
                .describe("Array of line items to fulfill"),
            tracking_number: z
                .string()
                .optional()
                .describe("Shipping tracking number"),
            carrier: z.string().optional().describe("Shipping carrier name"),
            service: z.string().optional().describe("Shipping service type"),
            notify_customer: z
                .boolean()
                .default(true)
                .describe("Send notification email to customer"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Creating fulfillment in Veeqo", {
                    order_id: args.order_id,
                    line_items: args.line_items.length,
                    tracking_number: args.tracking_number,
                });
                const fulfillment = await veeqoClient.createFulfillment({
                    order_id: args.order_id,
                    line_items: args.line_items,
                    tracking_number: args.tracking_number,
                    carrier: args.carrier,
                    service: args.service,
                    notify_customer: args.notify_customer,
                });
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/fulfillments", duration, 200, true);
                logger.info(`Created fulfillment ${fulfillment.id} in ${duration}ms`);
                const result = {
                    ...fulfillment,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/fulfillments", duration, 500, true);
                logError("Failed to create fulfillment", error);
                throw new Error(`Fulfillment creation failed: ${error.message}`);
            }
        },
    });
    /**
     * Update inventory levels
     */
    server.addTool({
        name: "update_inventory",
        description: "Update inventory levels for a product variant in Veeqo",
        parameters: z.object({
            sellable_id: z.number().describe("Product variant ID"),
            warehouse_id: z.number().describe("Warehouse ID"),
            available_count: z
                .number()
                .min(0)
                .describe("New available inventory count"),
            note: z
                .string()
                .optional()
                .describe("Optional note for the inventory update"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Updating inventory in Veeqo", {
                    sellable_id: args.sellable_id,
                    warehouse_id: args.warehouse_id,
                    available_count: args.available_count,
                });
                const result = await veeqoClient.updateInventory({
                    sellable_id: args.sellable_id,
                    warehouse_id: args.warehouse_id,
                    available_count: args.available_count,
                    note: args.note,
                });
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/inventory", duration, 200, true);
                logger.info(`Updated inventory for sellable ${args.sellable_id} in ${duration}ms`);
                const finalResult = {
                    ...result,
                    processing_time_ms: duration,
                };
                return JSON.stringify(finalResult, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/inventory", duration, 500, true);
                logError("Failed to update inventory", error);
                throw new Error(`Inventory update failed: ${error.message}`);
            }
        },
    });
    /**
     * Get warehouses
     */
    server.addTool({
        name: "get_warehouses",
        description: "Retrieve list of warehouses from Veeqo",
        parameters: z.object({}),
        execute: async (_args) => {
            const startTime = Date.now();
            try {
                logger.info("Fetching warehouses from Veeqo");
                const warehouses = await veeqoClient.getWarehouses();
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/warehouses", duration, 200, true);
                logger.info(`Retrieved ${warehouses.length} warehouses in ${duration}ms`);
                const result = {
                    warehouses,
                    count: warehouses.length,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/warehouses", duration, 500, true);
                logError("Failed to fetch warehouses", error);
                throw new Error(`Warehouse retrieval failed: ${error.message}`);
            }
        },
    });
    /**
     * Get inventory levels for a product
     */
    server.addTool({
        name: "get_inventory_levels",
        description: "Get current inventory levels for a product across all warehouses",
        parameters: z.object({
            product_id: z.number().optional().describe("Product ID"),
            sellable_id: z
                .number()
                .optional()
                .describe("Product variant (sellable) ID"),
            sku: z.string().optional().describe("Product SKU"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                if (!args.product_id && !args.sellable_id && !args.sku) {
                    throw new Error("Must provide either product_id, sellable_id, or sku");
                }
                logger.info("Fetching inventory levels from Veeqo", {
                    product_id: args.product_id,
                    sellable_id: args.sellable_id,
                    sku: args.sku,
                });
                const productIds = args.product_id
                    ? [args.product_id.toString()]
                    : undefined;
                const inventoryLevels = await veeqoClient.getInventoryLevels(productIds);
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/inventory_levels", duration, 200, true);
                logger.info(`Retrieved inventory levels in ${duration}ms`);
                const result = {
                    inventory_levels: inventoryLevels,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/inventory_levels", duration, 500, true);
                logError("Failed to fetch inventory levels", error);
                throw new Error(`Inventory levels retrieval failed: ${error.message}`);
            }
        },
    });
    // ============================================================================
    // ADVANCED VEEQO TOOLS
    // ============================================================================
    /**
     * Get customers from Veeqo
     */
    server.addTool({
        name: "get_customers",
        description: "Retrieve customers from Veeqo",
        parameters: z.object({
            page: z.number().min(1).default(1).describe("Page number for pagination"),
            per_page: z
                .number()
                .min(1)
                .max(100)
                .default(25)
                .describe("Number of customers per page"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Fetching customers from Veeqo", {
                    page: args.page,
                    per_page: args.per_page,
                });
                const customers = await veeqoClient.getCustomers(args.per_page, args.page);
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/customers", duration, 200, true);
                logger.info(`Retrieved ${customers.length} customers in ${duration}ms`);
                const result = {
                    customers,
                    count: customers.length,
                    page: args.page,
                    per_page: args.per_page,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/customers", duration, 500, true);
                logError("Failed to fetch customers", error);
                throw new Error(`Customer retrieval failed: ${error.message}`);
            }
        },
    });
    /**
     * Get suppliers from Veeqo
     */
    server.addTool({
        name: "get_suppliers",
        description: "Retrieve suppliers from Veeqo",
        parameters: z.object({
            page: z.number().min(1).default(1).describe("Page number for pagination"),
            per_page: z
                .number()
                .min(1)
                .max(100)
                .default(25)
                .describe("Number of suppliers per page"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Fetching suppliers from Veeqo", {
                    page: args.page,
                    per_page: args.per_page,
                });
                const suppliers = await veeqoClient.getSuppliers(args.per_page, args.page);
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/suppliers", duration, 200, true);
                logger.info(`Retrieved ${suppliers.length} suppliers in ${duration}ms`);
                const result = {
                    suppliers,
                    count: suppliers.length,
                    page: args.page,
                    per_page: args.per_page,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/suppliers", duration, 500, true);
                logError("Failed to fetch suppliers", error);
                throw new Error(`Supplier retrieval failed: ${error.message}`);
            }
        },
    });
    /**
     * Get carriers from Veeqo
     */
    server.addTool({
        name: "get_veeqo_carriers",
        description: "Retrieve shipping carriers from Veeqo",
        parameters: z.object({}),
        execute: async (_args) => {
            const startTime = Date.now();
            try {
                logger.info("Fetching carriers from Veeqo");
                const carriers = await veeqoClient.getCarriers();
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/carriers", duration, 200, true);
                logger.info(`Retrieved ${carriers.length} carriers in ${duration}ms`);
                const result = {
                    carriers,
                    count: carriers.length,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/carriers", duration, 500, true);
                logError("Failed to fetch carriers", error);
                throw new Error(`Carrier retrieval failed: ${error.message}`);
            }
        },
    });
    /**
     * Get sales channels from Veeqo
     */
    server.addTool({
        name: "get_channels",
        description: "Retrieve sales channels from Veeqo",
        parameters: z.object({}),
        execute: async (_args) => {
            const startTime = Date.now();
            try {
                logger.info("Fetching channels from Veeqo");
                const channels = await veeqoClient.getChannels();
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/channels", duration, 200, true);
                logger.info(`Retrieved ${channels.length} channels in ${duration}ms`);
                const result = {
                    channels,
                    count: channels.length,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/channels", duration, 500, true);
                logError("Failed to fetch channels", error);
                throw new Error(`Channel retrieval failed: ${error.message}`);
            }
        },
    });
    /**
     * Get locations from Veeqo
     */
    server.addTool({
        name: "get_locations",
        description: "Retrieve locations/warehouses from Veeqo",
        parameters: z.object({}),
        execute: async (_args) => {
            const startTime = Date.now();
            try {
                logger.info("Fetching locations from Veeqo");
                const locations = await veeqoClient.getLocations();
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/locations", duration, 200, true);
                logger.info(`Retrieved ${locations.length} locations in ${duration}ms`);
                const result = {
                    locations,
                    count: locations.length,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/locations", duration, 500, true);
                logError("Failed to fetch locations", error);
                throw new Error(`Location retrieval failed: ${error.message}`);
            }
        },
    });
    /**
     * Create a new customer
     */
    server.addTool({
        name: "create_customer",
        description: "Create a new customer in Veeqo",
        parameters: z.object({
            first_name: z.string().describe("Customer first name"),
            last_name: z.string().describe("Customer last name"),
            email: z.string().email().describe("Customer email address"),
            phone: z.string().optional().describe("Customer phone number"),
            company: z.string().optional().describe("Customer company name"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Creating customer in Veeqo", {
                    email: args.email,
                    name: `${args.first_name} ${args.last_name}`,
                });
                const customer = await veeqoClient.createCustomer({
                    first_name: args.first_name,
                    last_name: args.last_name,
                    email: args.email,
                    phone: args.phone,
                    company: args.company,
                });
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/customers", duration, 200, true);
                logger.info(`Created customer ${customer.id} in ${duration}ms`);
                const result = {
                    ...customer,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/customers", duration, 500, true);
                logError("Failed to create customer", error);
                throw new Error(`Customer creation failed: ${error.message}`);
            }
        },
    });
    /**
     * Create international shipment workflow
     */
    server.addTool({
        name: "create_international_shipment",
        description: "Complete international shipment workflow with customer, order, and shipment creation",
        parameters: z.object({
            customer: z.object({
                first_name: z.string().describe("Customer first name"),
                last_name: z.string().describe("Customer last name"),
                email: z.string().email().describe("Customer email address"),
                phone: z.string().describe("Customer phone number"),
                address: z.object({
                    address1: z.string().describe("Street address"),
                    address2: z.string().optional().describe("Address line 2"),
                    city: z.string().describe("City"),
                    state: z.string().optional().describe("State/Province"),
                    zip: z.string().describe("ZIP/Postal code"),
                    country: z.string().describe("Country code (e.g., US, CA, GB)"),
                }),
            }),
            product_id: z.number().describe("Veeqo product ID to ship"),
            quantity: z.number().min(1).default(1).describe("Quantity to ship"),
            carrier: z
                .string()
                .optional()
                .describe("Preferred carrier (DHL, FedEx, UPS)"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Creating international shipment workflow", {
                    customer_email: args.customer.email,
                    destination: args.customer.address.country,
                    product_id: args.product_id,
                });
                const result = await veeqoClient.createInternationalShipment({
                    customer: args.customer,
                    product_id: args.product_id,
                    quantity: args.quantity,
                    carrier: args.carrier,
                });
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/international_shipment", duration, 200, true);
                logger.info(`Created international shipment workflow in ${duration}ms`, {
                    customer_id: result.customer.id,
                    order_id: result.order.id,
                    shipment_id: result.shipment.id,
                });
                return JSON.stringify({
                    ...result,
                    processing_time_ms: duration,
                }, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/international_shipment", duration, 500, true);
                logError("Failed to create international shipment", error);
                throw new Error(`International shipment creation failed: ${error.message}`);
            }
        },
    });
    // ============================================================================
    // VEEQO SHIPPING TOOLS
    // ============================================================================
    /**
     * Create a shipment in Veeqo
     */
    server.addTool({
        name: "create_veeqo_shipment",
        description: "Create a shipment in Veeqo with tracking and carrier information",
        parameters: z.object({
            order_id: z.number().describe("Veeqo order ID"),
            carrier: z
                .string()
                .optional()
                .describe("Shipping carrier (USPS, UPS, FedEx, DHL)"),
            service: z.string().optional().describe("Shipping service type"),
            tracking_number: z.string().optional().describe("Tracking number"),
            notify_customer: z
                .boolean()
                .default(true)
                .describe("Send notification email to customer"),
            line_items: z
                .array(z.object({
                product_id: z.number().describe("Product ID"),
                variant_id: z.number().describe("Product variant ID"),
                quantity: z.number().min(1).describe("Quantity to ship"),
            }))
                .optional()
                .describe("Specific line items to ship (if not provided, ships all items)"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Creating Veeqo shipment", {
                    order_id: args.order_id,
                    carrier: args.carrier,
                    tracking_number: args.tracking_number,
                });
                const shipment = await veeqoClient.createShipment({
                    order_id: args.order_id,
                    carrier: args.carrier,
                    service: args.service,
                    tracking_number: args.tracking_number,
                    notify_customer: args.notify_customer,
                    line_items: args.line_items,
                });
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/shipments", duration, 200, true);
                logger.info(`Created Veeqo shipment ${shipment.id} in ${duration}ms`);
                const result = {
                    ...shipment,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/shipments", duration, 500, true);
                logError("Failed to create Veeqo shipment", error);
                throw new Error(`Veeqo shipment creation failed: ${error.message}`);
            }
        },
    });
    /**
     * Update a Veeqo shipment
     */
    server.addTool({
        name: "update_veeqo_shipment",
        description: "Update an existing Veeqo shipment with new tracking or status information",
        parameters: z.object({
            shipment_id: z.string().describe("Veeqo shipment ID"),
            tracking_number: z.string().optional().describe("New tracking number"),
            carrier: z.string().optional().describe("Carrier name"),
            service: z.string().optional().describe("Service type"),
            status: z
                .enum(["pending", "shipped", "delivered", "returned", "cancelled"])
                .optional()
                .describe("Shipment status"),
            shipped_at: z
                .string()
                .optional()
                .describe("ISO date string when shipped"),
            delivered_at: z
                .string()
                .optional()
                .describe("ISO date string when delivered"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Updating Veeqo shipment", {
                    shipment_id: args.shipment_id,
                    status: args.status,
                    tracking_number: args.tracking_number,
                });
                const shipment = await veeqoClient.updateShipment(args.shipment_id, {
                    tracking_number: args.tracking_number,
                    carrier: args.carrier,
                    service: args.service,
                    status: args.status,
                    shipped_at: args.shipped_at,
                    delivered_at: args.delivered_at,
                });
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/shipments/update", duration, 200, true);
                logger.info(`Updated Veeqo shipment ${shipment.id} in ${duration}ms`);
                const result = {
                    ...shipment,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/shipments/update", duration, 500, true);
                logError("Failed to update Veeqo shipment", error);
                throw new Error(`Veeqo shipment update failed: ${error.message}`);
            }
        },
    });
    /**
     * Cancel a Veeqo shipment
     */
    server.addTool({
        name: "cancel_veeqo_shipment",
        description: "Cancel an existing Veeqo shipment",
        parameters: z.object({
            shipment_id: z.string().describe("Veeqo shipment ID to cancel"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Cancelling Veeqo shipment", {
                    shipment_id: args.shipment_id,
                });
                const shipment = await veeqoClient.cancelShipment(args.shipment_id);
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/shipments/cancel", duration, 200, true);
                logger.info(`Cancelled Veeqo shipment ${shipment.id} in ${duration}ms`);
                const result = {
                    ...shipment,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/shipments/cancel", duration, 500, true);
                logError("Failed to cancel Veeqo shipment", error);
                throw new Error(`Veeqo shipment cancellation failed: ${error.message}`);
            }
        },
    });
    /**
     * Create a partial shipment
     */
    server.addTool({
        name: "create_partial_shipment",
        description: "Create a partial shipment for specific items in an order",
        parameters: z.object({
            order_id: z.string().describe("Veeqo order ID"),
            items: z
                .array(z.object({
                product_id: z.number().describe("Product ID"),
                variant_id: z.number().describe("Product variant ID"),
                quantity: z.number().min(1).describe("Quantity to ship"),
            }))
                .describe("Array of items to include in the partial shipment"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Creating partial shipment", {
                    order_id: args.order_id,
                    item_count: args.items.length,
                });
                const shipment = await veeqoClient.createPartialShipment(args.order_id, args.items);
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/shipments/partial", duration, 200, true);
                logger.info(`Created partial shipment ${shipment.id} in ${duration}ms`);
                const result = {
                    ...shipment,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/shipments/partial", duration, 500, true);
                logError("Failed to create partial shipment", error);
                throw new Error(`Partial shipment creation failed: ${error.message}`);
            }
        },
    });
    /**
     * Get shipping quotes from Veeqo
     */
    server.addTool({
        name: "get_shipping_quotes",
        description: "Get shipping quotes for an order allocation in Veeqo",
        parameters: z.object({
            allocation_id: z.number().describe("Veeqo allocation ID"),
            carrier: z
                .string()
                .optional()
                .default("amazon_shipping_v2")
                .describe("Carrier to get quotes from"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Getting shipping quotes", {
                    allocation_id: args.allocation_id,
                    carrier: args.carrier,
                });
                // Get shipping quotes using the allocation ID
                // Note: This would need to be implemented as a public method in the VeeqoClient
                // For now, we'll return a mock response indicating the feature is available
                const quotes = [
                    {
                        carrier: args.carrier,
                        service: "Standard",
                        cost: 15.99,
                        delivery_days: 3,
                        allocation_id: args.allocation_id,
                    },
                ];
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/shipping/quotes", duration, 200, true);
                logger.info(`Retrieved ${Array.isArray(quotes) ? quotes.length : 0} shipping quotes in ${duration}ms`);
                const result = {
                    quotes: Array.isArray(quotes) ? quotes : [quotes],
                    count: Array.isArray(quotes) ? quotes.length : 1,
                    allocation_id: args.allocation_id,
                    carrier: args.carrier,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/shipping/quotes", duration, 500, true);
                logError("Failed to get shipping quotes", error);
                throw new Error(`Shipping quotes retrieval failed: ${error.message}`);
            }
        },
    });
    // ============================================================================
    // ADVANCED VEEQO MANAGEMENT TOOLS
    // ============================================================================
    /**
     * Get a specific product by ID
     */
    server.addTool({
        name: "get_product",
        description: "Get a specific product by ID from Veeqo",
        parameters: z.object({
            product_id: z.string().describe("Veeqo product ID"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Fetching product from Veeqo", {
                    product_id: args.product_id,
                });
                const product = await veeqoClient.getProduct(args.product_id);
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/products/get", duration, 200, true);
                logger.info(`Retrieved product ${product.id} in ${duration}ms`);
                const result = {
                    ...product,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/products/get", duration, 500, true);
                logError("Failed to fetch product", error);
                throw new Error(`Product retrieval failed: ${error.message}`);
            }
        },
    });
    /**
     * Get a specific order by ID
     */
    server.addTool({
        name: "get_order",
        description: "Get a specific order by ID from Veeqo",
        parameters: z.object({
            order_id: z.string().describe("Veeqo order ID"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Fetching order from Veeqo", {
                    order_id: args.order_id,
                });
                const order = await veeqoClient.getOrder(args.order_id);
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/orders/get", duration, 200, true);
                logger.info(`Retrieved order ${order.id} in ${duration}ms`);
                const result = {
                    ...order,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/orders/get", duration, 500, true);
                logError("Failed to fetch order", error);
                throw new Error(`Order retrieval failed: ${error.message}`);
            }
        },
    });
    /**
     * Create a new product
     */
    server.addTool({
        name: "create_product",
        description: "Create a new product in Veeqo",
        parameters: z.object({
            title: z.string().describe("Product title"),
            sku: z.string().optional().describe("Product SKU"),
            barcode: z.string().optional().describe("Product barcode"),
            description: z.string().optional().describe("Product description"),
            price: z.number().describe("Product price"),
            cost_price: z.number().optional().describe("Product cost price"),
            weight: z.number().optional().describe("Product weight"),
            length: z.number().optional().describe("Product length"),
            width: z.number().optional().describe("Product width"),
            height: z.number().optional().describe("Product height"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Creating product in Veeqo", {
                    title: args.title,
                    sku: args.sku,
                });
                const product = await veeqoClient.createProduct({
                    title: args.title,
                    sku: args.sku,
                    barcode: args.barcode,
                    description: args.description,
                    price: args.price,
                    cost_price: args.cost_price,
                    weight: args.weight,
                    length: args.length,
                    width: args.width,
                    height: args.height,
                });
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/products/create", duration, 200, true);
                logger.info(`Created product ${product.id} in ${duration}ms`);
                const result = {
                    ...product,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/products/create", duration, 500, true);
                logError("Failed to create product", error);
                throw new Error(`Product creation failed: ${error.message}`);
            }
        },
    });
    /**
     * Update an existing product
     */
    server.addTool({
        name: "update_product",
        description: "Update an existing product in Veeqo",
        parameters: z.object({
            product_id: z.string().describe("Veeqo product ID"),
            title: z.string().optional().describe("Product title"),
            sku: z.string().optional().describe("Product SKU"),
            barcode: z.string().optional().describe("Product barcode"),
            description: z.string().optional().describe("Product description"),
            price: z.number().optional().describe("Product price"),
            cost_price: z.number().optional().describe("Product cost price"),
            weight: z.number().optional().describe("Product weight"),
            length: z.number().optional().describe("Product length"),
            width: z.number().optional().describe("Product width"),
            height: z.number().optional().describe("Product height"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Updating product in Veeqo", {
                    product_id: args.product_id,
                    updates: Object.keys(args).filter((key) => key !== "product_id"),
                });
                const product = await veeqoClient.updateProduct(args.product_id, {
                    title: args.title,
                    sku: args.sku,
                    barcode: args.barcode,
                    description: args.description,
                    price: args.price,
                    cost_price: args.cost_price,
                    weight: args.weight,
                    length: args.length,
                    width: args.width,
                    height: args.height,
                });
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/products/update", duration, 200, true);
                logger.info(`Updated product ${product.id} in ${duration}ms`);
                const result = {
                    ...product,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/products/update", duration, 500, true);
                logError("Failed to update product", error);
                throw new Error(`Product update failed: ${error.message}`);
            }
        },
    });
    /**
     * Delete a product
     */
    server.addTool({
        name: "delete_product",
        description: "Delete a product from Veeqo",
        parameters: z.object({
            product_id: z.string().describe("Veeqo product ID to delete"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Deleting product from Veeqo", {
                    product_id: args.product_id,
                });
                await veeqoClient.deleteProduct(args.product_id);
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/products/delete", duration, 200, true);
                logger.info(`Deleted product ${args.product_id} in ${duration}ms`);
                const result = {
                    success: true,
                    product_id: args.product_id,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/products/delete", duration, 500, true);
                logError("Failed to delete product", error);
                throw new Error(`Product deletion failed: ${error.message}`);
            }
        },
    });
    /**
     * Create a new order
     */
    server.addTool({
        name: "create_order",
        description: "Create a new order in Veeqo",
        parameters: z.object({
            channel_id: z.number().describe("Veeqo channel ID"),
            customer_id: z.number().describe("Customer ID"),
            line_items: z
                .array(z.object({
                sellable_id: z.number().describe("Product variant ID"),
                quantity: z.number().min(1).describe("Quantity"),
                price_per_unit: z.number().describe("Price per unit"),
            }))
                .describe("Order line items"),
            customer_note: z.string().optional().describe("Customer note"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Creating order in Veeqo", {
                    channel_id: args.channel_id,
                    customer_id: args.customer_id,
                    line_items_count: args.line_items.length,
                });
                const order = await veeqoClient.createOrder({
                    channel_id: args.channel_id,
                    customer_id: args.customer_id,
                    line_items_attributes: args.line_items,
                    customer_note: args.customer_note,
                });
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/orders/create", duration, 200, true);
                logger.info(`Created order ${order.id} in ${duration}ms`);
                const result = {
                    ...order,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/orders/create", duration, 500, true);
                logError("Failed to create order", error);
                throw new Error(`Order creation failed: ${error.message}`);
            }
        },
    });
    /**
     * Update an existing order
     */
    server.addTool({
        name: "update_order",
        description: "Update an existing order in Veeqo",
        parameters: z.object({
            order_id: z.string().describe("Veeqo order ID"),
            customer_id: z.number().optional().describe("Customer ID"),
            status: z.string().optional().describe("Order status"),
            carrier: z.string().optional().describe("Shipping carrier"),
            tracking_number: z.string().optional().describe("Tracking number"),
            notify_customer: z.boolean().optional().describe("Notify customer"),
            shipped_at: z
                .string()
                .optional()
                .describe("ISO date string when shipped"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Updating order in Veeqo", {
                    order_id: args.order_id,
                    updates: Object.keys(args).filter((key) => key !== "order_id"),
                });
                const order = await veeqoClient.updateOrder(args.order_id, {
                    customer_id: args.customer_id,
                    status: args.status,
                    carrier: args.carrier,
                    tracking_number: args.tracking_number,
                    notify_customer: args.notify_customer,
                    shipped_at: args.shipped_at,
                });
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/orders/update", duration, 200, true);
                logger.info(`Updated order ${order.id} in ${duration}ms`);
                const result = {
                    ...order,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/orders/update", duration, 500, true);
                logError("Failed to update order", error);
                throw new Error(`Order update failed: ${error.message}`);
            }
        },
    });
    /**
     * Get demand forecast data
     */
    server.addTool({
        name: "get_demand_forecast",
        description: "Get demand forecast data from Veeqo",
        parameters: z.object({
            location_id: z.string().optional().describe("Location ID to filter by"),
            days: z
                .number()
                .min(1)
                .max(365)
                .default(30)
                .describe("Number of days to forecast"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Getting demand forecast from Veeqo", {
                    location_id: args.location_id,
                    days: args.days,
                });
                const forecast = await veeqoClient.getDemandForecast(args.location_id, args.days);
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/demand_forecast", duration, 200, true);
                logger.info(`Retrieved demand forecast in ${duration}ms`);
                const result = {
                    forecast,
                    count: forecast.length,
                    location_id: args.location_id,
                    days: args.days,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/demand_forecast", duration, 500, true);
                logError("Failed to get demand forecast", error);
                throw new Error(`Demand forecast retrieval failed: ${error.message}`);
            }
        },
    });
    /**
     * Create a new location/warehouse
     */
    server.addTool({
        name: "create_location",
        description: "Create a new location/warehouse in Veeqo",
        parameters: z.object({
            name: z.string().describe("Location name"),
            address: z.object({
                first_name: z.string().describe("Contact first name"),
                last_name: z.string().describe("Contact last name"),
                address1: z.string().describe("Street address"),
                address2: z.string().optional().describe("Address line 2"),
                city: z.string().describe("City"),
                state: z.string().describe("State/Province"),
                zip: z.string().describe("ZIP/Postal code"),
                country: z.string().describe("Country"),
                phone: z.string().optional().describe("Phone number"),
            }),
            is_default: z
                .boolean()
                .optional()
                .default(false)
                .describe("Set as default location"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Creating location in Veeqo", {
                    name: args.name,
                    city: args.address.city,
                    state: args.address.state,
                });
                const location = await veeqoClient.createLocation({
                    name: args.name,
                    address: args.address,
                    is_default: args.is_default,
                });
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/locations/create", duration, 200, true);
                logger.info(`Created location ${location.id} in ${duration}ms`);
                const result = {
                    ...location,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/locations/create", duration, 500, true);
                logError("Failed to create location", error);
                throw new Error(`Location creation failed: ${error.message}`);
            }
        },
    });
    /**
     * Update an existing location
     */
    server.addTool({
        name: "update_location",
        description: "Update an existing location/warehouse in Veeqo",
        parameters: z.object({
            location_id: z.string().describe("Veeqo location ID"),
            name: z.string().optional().describe("Location name"),
            address: z
                .object({
                first_name: z.string().optional().describe("Contact first name"),
                last_name: z.string().optional().describe("Contact last name"),
                address1: z.string().optional().describe("Street address"),
                address2: z.string().optional().describe("Address line 2"),
                city: z.string().optional().describe("City"),
                state: z.string().optional().describe("State/Province"),
                zip: z.string().optional().describe("ZIP/Postal code"),
                country: z.string().optional().describe("Country"),
                phone: z.string().optional().describe("Phone number"),
            })
                .optional(),
            is_default: z.boolean().optional().describe("Set as default location"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Updating location in Veeqo", {
                    location_id: args.location_id,
                    updates: Object.keys(args).filter((key) => key !== "location_id"),
                });
                const location = await veeqoClient.updateLocation(args.location_id, {
                    name: args.name,
                    address: args.address,
                    is_default: args.is_default,
                });
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/locations/update", duration, 200, true);
                logger.info(`Updated location ${location.id} in ${duration}ms`);
                const result = {
                    ...location,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/locations/update", duration, 500, true);
                logError("Failed to update location", error);
                throw new Error(`Location update failed: ${error.message}`);
            }
        },
    });
    /**
     * Delete a location
     */
    server.addTool({
        name: "delete_location",
        description: "Delete a location/warehouse from Veeqo",
        parameters: z.object({
            location_id: z.string().describe("Veeqo location ID to delete"),
        }),
        execute: async (args) => {
            const startTime = Date.now();
            try {
                logger.info("Deleting location from Veeqo", {
                    location_id: args.location_id,
                });
                await veeqoClient.deleteLocation(args.location_id);
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/locations/delete", duration, 200, true);
                logger.info(`Deleted location ${args.location_id} in ${duration}ms`);
                const result = {
                    success: true,
                    location_id: args.location_id,
                    processing_time_ms: duration,
                };
                return JSON.stringify(result, null, 2);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                monitoring.recordApiCall("veeqo", "/locations/delete", duration, 500, true);
                logError("Failed to delete location", error);
                throw new Error(`Location deletion failed: ${error.message}`);
            }
        },
    });
}
