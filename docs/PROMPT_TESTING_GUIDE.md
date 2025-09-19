# MCP Prompt Testing Guide

## Overview

This guide shows you how to test the custom MCP prompts we've developed for the unified EasyPost-Veeqo MCP server. These prompts orchestrate multiple tools to handle complex business workflows with natural language commands.

## Available Prompts

### 1. **fulfill_order** - Complete Order Fulfillment

**Purpose**: Handles the entire order fulfillment workflow from start to finish.

**Natural Language Examples**:

```
"Fulfill order 12345 with FedEx Express shipping"
"Process order 67890 using the cheapest shipping option"
"Complete fulfillment for order 11111 with UPS Ground"
```

**What it does**:

1. Retrieves order details from Veeqo
2. Gets customer shipping address
3. Calculates package dimensions and weight
4. Gets warehouse address
5. Calculates shipping rates
6. Selects best shipping option
7. Creates shipping label
8. Updates inventory levels
9. Creates fulfillment record
10. Creates Veeqo shipment record

**Parameters**:

- `order_id` (required): Veeqo order ID to fulfill
- `preferred_carrier` (optional): USPS, UPS, FedEx, DHL
- `preferred_service` (optional): Ground, Priority, Express

### 2. **analyze_shipping_costs** - Shipping Cost Analysis

**Purpose**: Analyzes shipping costs across multiple scenarios to optimize shipping strategy.

**Natural Language Examples**:

```
"Analyze shipping costs for 1lb, 5lb, and 10lb packages to major US cities"
"Compare shipping costs from San Francisco to New York, Chicago, and Miami"
"Show me the most cost-effective shipping options for different package sizes"
```

**What it does**:

1. Takes multiple package scenarios
2. Calculates rates for each scenario
3. Identifies cheapest and fastest options
4. Generates cost analysis by carrier
5. Provides optimization recommendations

**Parameters**:

- `package_scenarios` (required): Array of package scenarios
- `origin_zip` (required): Origin ZIP code

### 3. **optimize_inventory** - Inventory Optimization

**Purpose**: Analyzes inventory levels and provides optimization recommendations.

**Natural Language Examples**:

```
"Analyze inventory levels across all warehouses"
"Show me low stock alerts for warehouse 1 and 2"
"Find products that need restocking with threshold of 5 units"
```

**What it does**:

1. Gets all warehouses and products
2. Analyzes inventory levels
3. Identifies low stock and out-of-stock items
4. Calculates average stock levels
5. Generates optimization recommendations

**Parameters**:

- `warehouse_ids` (optional): Array of warehouse IDs
- `low_stock_threshold` (optional): Low stock threshold (default: 10)

### 4. **setup_international_shipping** - International Shipping Workflow

**Purpose**: Handles complete international shipping setup with customs.

**Natural Language Examples**:

```
"Set up international shipping for John Smith in London, shipping product 12345"
"Create international shipment to Canada for customer jane@example.com"
"Process international order for product 67890 to Germany"
```

**What it does**:

1. Creates or finds customer
2. Gets product details
3. Sets up international shipment
4. Handles customs information
5. Creates complete shipping workflow

**Parameters**:

- `customer_info` (required): Customer information
- `product_id` (required): Veeqo product ID
- `quantity` (optional): Quantity to ship (default: 1)

## Testing in MCP Inspector

### Step 1: Start the Server

```bash
EASYPOST_API_KEY=mock VEEQO_API_KEY=mock pnpm run dev
```

### Step 2: Open MCP Inspector

1. Open MCP Inspector in your browser
2. Connect to your MCP server
3. Navigate to the **Prompts** tab

### Step 3: Test Each Prompt

#### Test Order Fulfillment:

```
Fulfill order 12345 with FedEx Express shipping
```

#### Test Shipping Cost Analysis:

```
Analyze shipping costs for these scenarios:
- 1lb package to New York, NY 10001
- 5lb package to Chicago, IL 60601
- 10lb package to Los Angeles, CA 90210
From origin ZIP 94105
```

#### Test Inventory Optimization:

```
Analyze inventory levels across all warehouses with low stock threshold of 5
```

#### Test International Shipping:

```
Set up international shipping for:
Customer: John Smith, john@example.com, +1-555-0123
Address: 123 Baker St, London, UK, SW1A 1AA
Product: 12345
Quantity: 2
```

## Expected Results

### Order Fulfillment Response:

```json
{
  "success": true,
  "order_id": "12345",
  "tracking_code": "1Z1234567890123456",
  "carrier": "FedEx",
  "service": "Express",
  "rate": "25.50",
  "label_url": "https://easypost-files.s3-us-west-2.amazonaws.com/files/postage_label/20240101/abc123.pdf",
  "fulfillment_id": 789,
  "shipment_id": 456,
  "summary": "Successfully fulfilled order 12345 with FedEx Express shipping. Tracking: 1Z1234567890123456"
}
```

### Shipping Cost Analysis Response:

```json
{
  "success": true,
  "analysis": [
    {
      "scenario": "Package 1lbs",
      "destination": "New York, NY",
      "rates": [
        {
          "carrier": "USPS",
          "service": "Priority",
          "cost": 8.5,
          "delivery_days": 2
        },
        {
          "carrier": "UPS",
          "service": "Ground",
          "cost": 12.0,
          "delivery_days": 3
        }
      ],
      "cheapest_option": {
        "carrier": "USPS",
        "service": "Priority",
        "cost": 8.5
      },
      "fastest_option": {
        "carrier": "USPS",
        "service": "Priority",
        "cost": 8.5
      }
    }
  ],
  "recommendations": {
    "average_cost": 10.25,
    "most_cost_effective_carrier": "USPS",
    "cost_savings_potential": 3.5
  }
}
```

## Advanced Testing Scenarios

### 1. Multi-Step Workflow Testing

Test prompts that involve multiple API calls and complex logic:

```
"Fulfill order 12345, then analyze the shipping costs for similar future orders"
```

### 2. Error Handling Testing

Test prompts with invalid data:

```
"Fulfill order 99999" (non-existent order)
"Analyze shipping costs with invalid ZIP codes"
```

### 3. Performance Testing

Test prompts with large datasets:

```
"Analyze inventory for all 1000+ products across 5 warehouses"
```

## Mock Data Benefits

Since we're using mock API keys:

- ✅ **Fast responses** - No network delays
- ✅ **Consistent data** - Same results every time
- ✅ **No API costs** - Free testing
- ✅ **Reliable testing** - No rate limiting or failures
- ✅ **Complete workflows** - All steps work end-to-end

## Troubleshooting

### Common Issues:

1. **Server not starting**: Check that mock API keys are set
2. **Prompts not appearing**: Restart the server after adding prompts
3. **Parameter errors**: Check that required parameters are provided
4. **Mock data issues**: Verify mock responses are properly structured

### Debug Tips:

1. Check server logs for detailed error messages
2. Use the Tools tab to test individual tools first
3. Verify mock data structure matches expected format
4. Test with simple prompts before complex ones

## Next Steps

1. **Test all prompts** using the examples above
2. **Create custom prompts** for your specific use cases
3. **Integrate with real APIs** by replacing mock keys
4. **Deploy to production** with proper authentication

## Custom Prompt Development

To create your own prompts:

1. **Add to `/src/server/prompts/index.ts`**
2. **Use `server.addPrompt()` method**
3. **Define parameters and execute function**
4. **Test in MCP Inspector**
5. **Deploy and use in production**

The prompt system makes complex shipping and inventory workflows as simple as natural language commands!
