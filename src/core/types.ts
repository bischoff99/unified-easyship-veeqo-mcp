export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string | null;
  method: string;
  params?: any;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: any;
  error?: { code: number; message: string; data?: any };
}

// Canonical shipping domain types and provider interface

export interface ShippingAddress {
  name?: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface ParcelDimensions {
  length: number;
  width: number;
  height: number;
  weightOz: number;
  predefinedPackage?: string;
}

export interface CanonicalRate {
  id: string;
  carrier: string;
  service: string;
  currency: string;
  amount: number;
  deliveryDays?: number;
  estimatedDeliveryDate?: string | null;
  provider: 'easypost' | 'veeqo';
  raw?: unknown;
}

export interface PurchasedLabel {
  trackingCode: string;
  carrier: string;
  service: string;
  amount?: number;
  currency?: string;
  labelUrl?: string;
  provider: 'easypost' | 'veeqo';
  raw?: unknown;
}

export interface ShipmentRequest {
  to: ShippingAddress;
  from: ShippingAddress;
  parcel: ParcelDimensions;
  carriers?: string[];
  customs?: unknown;
}

export interface ShippingProvider {
  getRates(request: ShipmentRequest): Promise<CanonicalRate[]>;
  buyLabel(request: ShipmentRequest & { rateId?: string; carrier: string; service: string }): Promise<PurchasedLabel>;
}
