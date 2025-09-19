# Shipping Tools Comparison - Both Server Implementations

Your unified MCP server has **two server implementations**, both now equipped with comprehensive shipping tools.

## 🚀 **FastMCP Server** (`src/server/fastmcp-server.ts`)

_Modern FastMCP framework implementation_

**All Shipping Tools Available:**

### 1. `calculate_shipping_rates`

- **Purpose**: Multi-carrier rate calculation and comparison
- **Input**: from_address, to_address, parcel, optional service_types
- **Output**: Comprehensive rate list with processing time
- **Features**: Service filtering, performance monitoring

### 2. `create_shipping_label`

- **Purpose**: Generate shipping labels for packages
- **Input**: addresses, parcel, carrier, service, optional reference
- **Output**: Shipping label with tracking code
- **Features**: Multi-carrier support, reference tracking

### 3. `track_shipment`

- **Purpose**: Track package status and location
- **Input**: tracking_code, optional carrier
- **Output**: Detailed tracking information
- **Features**: Real-time status updates, delivery estimates

### 4. `validate_address`

- **Purpose**: Address validation and standardization
- **Input**: address object
- **Output**: Validated/corrected address
- **Features**: USPS address verification, error correction

### 5. `get_parcel_presets`

- **Purpose**: Standard package dimension presets
- **Input**: optional carrier filter
- **Output**: List of common package sizes
- **Features**: Carrier-specific presets

### 6. `optimize_shipping` ⭐ **NEW**

- **Purpose**: Advanced multi-carrier optimization with AI recommendations
- **Input**: addresses, parcel, preferences (cost limits, speed priority, etc.)
- **Output**: Intelligent recommendations (fastest, cheapest, best value)
- **Features**:
  - Multi-carrier analysis (USPS, UPS, FedEx)
  - Cost vs speed optimization
  - Savings calculations
  - Carrier performance analysis
  - Smart filtering and recommendations

---

## 🔧 **Core MCP Server** (`src/core/server.ts`)

_Traditional MCP protocol implementation_

**All Shipping Tools Available:**

### 1. `ep.verify_address`

- **Purpose**: Address verification using EasyPost
- **Input**: address object
- **Output**: Verified address

### 2. `ep.health`

- **Purpose**: System health monitoring
- **Input**: none
- **Output**: Comprehensive health status

### 3. `ep.parcel_presets`

- **Purpose**: Standard package presets
- **Input**: none
- **Output**: Package dimension options

### 4. `ep.weight_to_oz`

- **Purpose**: Weight unit conversions
- **Input**: weight, unit
- **Output**: Converted weight in ounces

### 5. `ep.optimize_shipping` ⭐ **NEW**

- **Purpose**: Advanced shipping optimization
- **Input**: addresses, parcel, preferences
- **Output**: Optimization recommendations
- **Features**: Same advanced features as FastMCP version

### 6. `ep.get_shipping_rates` ⭐ **NEW**

- **Purpose**: Direct EasyPost rate retrieval
- **Input**: addresses, parcel
- **Output**: Available shipping rates

### 7. `ep.track_shipment` ⭐ **NEW**

- **Purpose**: Package tracking
- **Input**: tracking_code
- **Output**: Tracking information

### 8. `ep.create_shipment` ⭐ **NEW**

- **Purpose**: Create shipping labels
- **Input**: addresses, parcel, customs_info
- **Output**: Shipment details with tracking

---

## 🎯 **Recommendation**

### **Use FastMCP Server** for:

- ✅ **Production deployments** - Modern architecture
- ✅ **Advanced integrations** - Rich tool ecosystem
- ✅ **Development flexibility** - Easy to extend
- ✅ **Better error handling** - Comprehensive monitoring
- ✅ **Performance optimization** - Built-in metrics

### **Use Core MCP Server** for:

- ✅ **Legacy compatibility** - Traditional MCP protocol
- ✅ **Simple integrations** - Direct tool calls
- ✅ **Debugging/testing** - Straightforward implementation

---

## 🚀 **Getting Started**

### Start FastMCP Server:

```bash
pnpm run dev:fastmcp
# or production
pnpm run start:fastmcp
```

### Start Core MCP Server:

```bash
pnpm run dev
# or production
pnpm run start
```

Both servers now have **complete shipping toolsets** with the advanced optimization features! 🎉

### ⭐ **New Advanced Features Available in Both:**

- **Multi-carrier optimization** with intelligent recommendations
- **Cost vs speed analysis** for better shipping decisions
- **Savings calculations** showing potential cost reductions
- **Smart filtering** by price, delivery time, preferred carriers
- **Performance analytics** across different shipping providers

Your shipping operations are now fully optimized across both server implementations! 🚢✨

---

_Last updated: September 2025_
_Status: Both servers feature-complete ✅_
