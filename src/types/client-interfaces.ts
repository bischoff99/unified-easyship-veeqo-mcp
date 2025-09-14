/**
 * Comprehensive Type Definitions for MCP Server Clients
 * Defines interfaces that match actual implementation capabilities
 */

// Base interfaces
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  per_page: number;
  total: number;
  has_more: boolean;
}

// EasyPost specific interfaces
export interface EasyPostAddress {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
  residential?: boolean;
  carrier_facility?: string;
  federal_tax_id?: string;
  state_tax_id?: string;
}

export interface EasyPostParcel {
  length: number;
  width: number;
  height: number;
  weight: number;
}

export interface EasyPostRate {
  id: string;
  carrier: string;
  service: string;
  rate: string;
  delivery_days: number;
  delivery_date?: string;
  delivery_date_guaranteed: boolean;
}

export interface EasyPostShipment {
  id: string;
  object: string;
  mode: string;
  to_address: EasyPostAddress;
  from_address: EasyPostAddress;
  return_address?: EasyPostAddress;
  buyer_address?: EasyPostAddress;
  parcel: EasyPostParcel;
  selected_rate?: EasyPostRate;
  postage_label?: {
    id: string;
    label_url: string;
    label_pdf_url: string;
    label_epl2_url?: string;
  };
  tracking_code: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface EasyPostTracker {
  id: string;
  tracking_code: string;
  carrier: string;
  status: string;
  status_detail: string;
  tracking_details: Array<{
    datetime: string;
    status: string;
    message: string;
    location?: string;
  }>;
  public_url: string;
  updated_at: string;
}

// Veeqo specific interfaces
export interface VeeqoProduct {
  id: number;
  title: string;
  product_brand_id?: number;
  description?: string;
  notes?: string;
  tags?: string[];
  created_by_id: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  sellables: VeeqoSellable[];
}

export interface VeeqoSellable {
  id: number;
  product_id: number;
  title: string;
  sku_code: string;
  full_title: string;
  price: string;
  cost_price?: string;
  sellable_on_hand_value: number;
  created_at: string;
  updated_at: string;
}

export interface VeeqoOrder {
  id: number;
  number: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  deliver_to: {
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
  };
  line_items: Array<{
    id: number;
    sellable_id: number;
    quantity: number;
    price_per_unit: string;
    total_price: string;
  }>;
}

export interface VeeqoFulfillment {
  id: number;
  order_id: number;
  tracking_number?: string;
  carrier?: string;
  service?: string;
  shipped_at?: string;
  created_at: string;
  line_items: Array<{
    sellable_id: number;
    quantity: number;
  }>;
}

export interface VeeqoWarehouse {
  id: number;
  name: string;
  address: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  default: boolean;
  created_at: string;
}

// Client method parameters
export interface GetProductsParams {
  page?: number;
  per_page?: number;
  query?: string;
  sku?: string;
}

export interface GetOrdersParams {
  page?: number;
  per_page?: number;
  status?: string;
  since?: string;
}

export interface CreateFulfillmentParams {
  order_id: number;
  line_items: Array<{
    sellable_id: number;
    quantity: number;
  }>;
  tracking_number?: string;
  carrier?: string;
  service?: string;
  notify_customer?: boolean;
}

export interface UpdateInventoryParams {
  sellable_id: number;
  warehouse_id: number;
  available_count: number;
  note?: string;
}

export interface GetInventoryLevelsParams {
  product_id?: number;
  sellable_id?: number;
  sku?: string;
}

// Enhanced client interfaces
export interface EnhancedEasyPostClient {
  getRates(_from: EasyPostAddress, _to: EasyPostAddress, _parcel: EasyPostParcel): Promise<EasyPostRate[]>;
  createShipment(_from: EasyPostAddress, _to: EasyPostAddress, _parcel: EasyPostParcel, _options?: {
    service?: string;
    carrier?: string;
  }): Promise<EasyPostShipment>;
  trackPackage(_trackingCode: string): Promise<EasyPostTracker>;
  verifyAddress(_address: EasyPostAddress): Promise<EasyPostAddress>;
  getParcelPresets(_carrier?: string): Promise<any[]>;
}

export interface EnhancedVeeqoClient {
  getProducts(_params?: GetProductsParams): Promise<VeeqoProduct[]>;
  getOrders(_params?: GetOrdersParams): Promise<VeeqoOrder[]>;
  createFulfillment(_params: CreateFulfillmentParams): Promise<VeeqoFulfillment>;
  updateInventory(_params: UpdateInventoryParams): Promise<{ success: boolean; message: string }>;
  getWarehouses(): Promise<VeeqoWarehouse[]>;
  getInventoryLevels(_params: GetInventoryLevelsParams): Promise<Array<{
    sellable_id: number;
    warehouse_id: number;
    available: number;
    allocated: number;
    incoming: number;
  }>>;
}

// Monitoring and logging interfaces
export interface SafeLogger {
  info(_message: string, _meta?: Record<string, any>): void;
  error(_message: string, _error?: any): void;
  warn(_message: string, _meta?: Record<string, any>): void;
  debug(_message: string, _meta?: Record<string, any>): void;
}

export interface SafeMonitoring {
  recordApiCall(_service: string, _endpoint: string, _duration: number, _statusCode?: number, _isError?: boolean): void;
  recordMetric(_name: string, _value: number, _labels?: Record<string, string>, _metadata?: Record<string, any>): void;
  recordError(_error: Error, _context?: Record<string, any>): void;
}