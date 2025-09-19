# MCP Tools Reference
**Project:** Unified EasyPost-Veeqo MCP Server  
**Date:** September 18, 2025  
**Total Tools:** 24 MCP Tools

## 🚚 **Shipping Tools (13 tools)**

### **Core Shipping Operations**
1. **`calculate_shipping_rates`**
   - Calculate shipping rates from multiple carriers
   - Parameters: from_address, to_address, parcel, service_types (optional)
   - Returns: Array of rates with carrier, service, cost, delivery time

2. **`create_shipping_label`**
   - Create a shipping label for a package
   - Parameters: from_address, to_address, parcel, service, carrier, reference (optional)
   - Returns: Label with tracking code and postage information

3. **`track_shipment`**
   - Track the status and location of a shipment
   - Parameters: tracking_code, carrier (optional)
   - Returns: Tracking details and delivery status

4. **`track_package`**
   - Alias for track_shipment
   - Parameters: tracking_code, carrier (optional)
   - Returns: Same as track_shipment

### **Address & Validation**
5. **`validate_address`**
   - Validate and normalize a shipping address
   - Parameters: address
   - Returns: Validated address with corrections

6. **`verify_address`**
   - Verify and normalize a shipping address
   - Parameters: address
   - Returns: Verified address information

### **Advanced Shipping**
7. **`optimize_shipping`**
   - Advanced shipping optimization with multi-carrier analysis
   - Parameters: from_address, to_address, parcel, preferences (optional)
   - Returns: Optimized shipping recommendations

8. **`get_international_rates`**
   - Get international shipping rates with customs support
   - Parameters: from_address, to_address, parcel, customs_info (optional)
   - Returns: International rates with customs information

9. **`get_rates_by_carriers`**
   - Get shipping rates from specific carriers only
   - Parameters: from_address, to_address, parcel, carriers
   - Returns: Filtered rates by specified carriers

10. **`get_rates_by_zip`**
    - Get shipping rates by ZIP codes (simplified method)
    - Parameters: from_zip, to_zip, weight, service_types (optional)
    - Returns: Rates for ZIP-to-ZIP shipping

### **Utility & Information**
11. **`get_parcel_presets`**
    - Get predefined parcel dimensions for common package types
    - Parameters: carrier (optional)
    - Returns: Standard parcel dimensions

12. **`weight_to_oz`**
    - Convert weight from various units to ounces
    - Parameters: weight, unit (lb, kg, g, oz)
    - Returns: Weight in ounces

13. **`purchase_shipment_with_carrier`**
    - Purchase a shipment with a specific carrier and service
    - Parameters: shipment_id, carrier, service
    - Returns: Purchased shipment details

### **System & Carrier Info**
14. **`get_carriers`**
    - Get list of available carriers and their services
    - Parameters: None
    - Returns: Available carriers and services

15. **`get_carrier_accounts`**
    - Get carrier account information and status
    - Parameters: None
    - Returns: Carrier account details

16. **`health_check`**
    - Check system health and external API connectivity
    - Parameters: verbose (optional)
    - Returns: System health status

## 📦 **Inventory Tools (8 tools)**

### **Products & Orders**
1. **`get_products`**
   - Retrieve products from Veeqo inventory
   - Parameters: page, per_page, search (optional)
   - Returns: Product list with details

2. **`get_orders`**
   - Retrieve orders from Veeqo
   - Parameters: page, per_page, status (optional)
   - Returns: Order list with details

3. **`create_fulfillment`**
   - Create a fulfillment for an order in Veeqo
   - Parameters: order_id, line_items
   - Returns: Fulfillment details

### **Inventory Management**
4. **`update_inventory`**
   - Update inventory levels for a product variant in Veeqo
   - Parameters: sellable_id, warehouse_id, quantity
   - Returns: Updated inventory information

5. **`get_inventory_levels`**
   - Get current inventory levels for a product across all warehouses
   - Parameters: product_id (optional)
   - Returns: Inventory levels by warehouse

6. **`get_warehouses`**
   - Retrieve list of warehouses from Veeqo
   - Parameters: None
   - Returns: Warehouse list with details

### **Business Data**
7. **`get_customers`**
   - Retrieve customers from Veeqo
   - Parameters: page, per_page, search (optional)
   - Returns: Customer list with details

8. **`get_suppliers`**
   - Retrieve suppliers from Veeqo
   - Parameters: page, per_page, search (optional)
   - Returns: Supplier list with details

9. **`get_veeqo_carriers`**
   - Retrieve shipping carriers from Veeqo
   - Parameters: None
   - Returns: Veeqo carrier configuration

10. **`get_channels`**
    - Retrieve sales channels from Veeqo
    - Parameters: None
    - Returns: Sales channel configuration

## ✅ **Validation Tools (1 tool)**

### **FedEx Validation**
1. **`validate_fedex_order`**
   - Validate order against FedEx shipping standards
   - Parameters: origin_address, destination_address, parcel, requested_carrier (optional), is_international (optional)
   - Returns: Comprehensive validation results including:
     - Dimension validation
     - Weight limits
     - Address format compliance
     - Service availability
     - International restrictions

## 🔧 **Tool Categories Summary**

| **Category** | **Count** | **Purpose** |
|--------------|-----------|-------------|
| **Shipping** | 16 tools | EasyPost integration, rate calculation, label creation, tracking |
| **Inventory** | 10 tools | Veeqo integration, product management, order fulfillment |
| **Validation** | 1 tool | FedEx standards compliance |
| **System** | 2 tools | Health checks, carrier information |
| **Total** | **29 tools** | Complete shipping and inventory management |

## 🎯 **Key Features**

### **Multi-Carrier Support**
- USPS, UPS, FedEx, DHL integration
- Carrier-specific validation
- Service type filtering

### **International Shipping**
- Customs information support
- Country-specific restrictions
- International rate calculation

### **Inventory Integration**
- Veeqo API integration
- Real-time inventory updates
- Order fulfillment automation

### **Address Management**
- Address validation and normalization
- International address support
- Format standardization

### **Advanced Features**
- Shipping optimization
- Multi-carrier rate comparison
- Weight unit conversion
- System health monitoring

## 📋 **Usage Examples**

### **Calculate Shipping Rates**
```json
{
  "from_address": {
    "name": "John Doe",
    "street1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "US"
  },
  "to_address": {
    "name": "Jane Smith",
    "street1": "456 Oak Ave",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90210",
    "country": "US"
  },
  "parcel": {
    "length": 10,
    "width": 8,
    "height": 6,
    "weight": 2
  }
}
```

### **Validate FedEx Order**
```json
{
  "origin_address": {
    "name": "Sender Name",
    "street1": "123 Business St",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "US"
  },
  "destination_address": {
    "name": "Recipient Name",
    "street1": "456 Customer Ave",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90210",
    "country": "US"
  },
  "parcel": {
    "length": 13,
    "width": 13,
    "height": 7,
    "weight": 4.5
  },
  "requested_carrier": "FedEx",
  "is_international": false
}
```

---
**MCP Tools Reference created:** September 18, 2025  
**Status:** Complete tool inventory documented