/**
 * Enhanced EasyPost Client Implementation
 *
 * Based on EasyPost API documentation research, this client provides
 * comprehensive integration with EasyPost's shipping services.
 */

import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

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
  predefined_package?: string;
}

export interface EasyPostRate {
  id: string;
  object: string;
  mode: string;
  service: string;
  carrier: string;
  rate: string;
  currency: string;
  retail_rate: string;
  retail_currency: string;
  list_rate: string;
  list_currency: string;
  billing_type: string;
  delivery_days: number;
  delivery_date: string | null;
  delivery_date_guaranteed: boolean;
  est_delivery_days: number;
  shipment_id: string;
  carrier_account_id: string;
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
  customs_info?: any;
  scan_form?: any;
  forms?: any[];
  insurance?: string;
  rates: EasyPostRate[];
  selected_rate?: EasyPostRate;
  postage_label?: any;
  messages: any[];
  options: any;
  is_return: boolean;
  tracking_code?: string;
  usps_zone?: number;
  status: string;
  tracker?: any;
  fees: any[];
  refund_status?: string;
  batch_id?: string;
  batch_status?: string;
  batch_message?: string;
  created_at: string;
  updated_at: string;
}

export interface EasyPostTracker {
  id: string;
  object: string;
  mode: string;
  tracking_code: string;
  status: string;
  status_detail: string;
  signed_by?: string;
  weight?: number;
  est_delivery_date?: string;
  shipment_id?: string;
  carrier: string;
  tracking_details: EasyPostTrackingDetail[];
  carrier_detail?: any;
  public_url: string;
  fees: any[];
  created_at: string;
  updated_at: string;
}

export interface EasyPostTrackingDetail {
  object: string;
  message: string;
  description?: string;
  status: string;
  status_detail: string;
  datetime: string;
  source: string;
  tracking_location?: EasyPostTrackingLocation;
}

export interface EasyPostTrackingLocation {
  object: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
}

export class EasyPostClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly mockMode: boolean;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || config.easypost.apiKey;
    this.baseUrl = config.easypost.baseUrl;
    this.timeout = config.easypost.timeout;
    this.mockMode = config.easypost.mockMode;

    // Validate API key
    if (!this.apiKey || this.apiKey.trim() === '') {
      throw new Error('EASYPOST_API_KEY is required');
    }

    if (this.mockMode) {
      logger.info('EasyPost client initialized in mock mode');
    } else {
      logger.info('EasyPost client initialized with API key');
    }
  }

  /**
   * Create a shipment with rates
   */
  async createShipment(
    toAddress: EasyPostAddress,
    fromAddress: EasyPostAddress,
    parcel: EasyPostParcel,
    customsInfo?: any
  ): Promise<EasyPostShipment> {
    if (this.mockMode) {
      return this.getMockShipment(toAddress, fromAddress, parcel);
    }

    try {
      const shipmentData: any = {
        shipment: {
          to_address: toAddress,
          from_address: fromAddress,
          parcel,
        },
      };

      // Add customs info if provided (for international shipments)
      if (customsInfo) {
        shipmentData.shipment.customs_info = customsInfo;
      }

      const response = await this.makeRequest('POST', '/shipments', shipmentData);

      logger.info({ shipmentId: response.id }, 'Shipment created successfully');
      return response;
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to create shipment');
      throw error;
    }
  }

  /**
   * Get shipping rates for a shipment
   */
  async getRates(
    toAddress: EasyPostAddress,
    fromAddress: EasyPostAddress,
    parcel: EasyPostParcel,
    carriers?: string[],
    customsInfo?: any
  ): Promise<EasyPostRate[]> {
    if (this.mockMode) {
      return this.getMockRates(toAddress, fromAddress, parcel, carriers);
    }

    try {
      const shipment = await this.createShipment(toAddress, fromAddress, parcel, customsInfo);

      // Filter rates by carriers if specified
      let rates = shipment.rates;
      if (carriers && carriers.length > 0) {
        rates = rates.filter((rate) =>
          carriers.some((carrier) => rate.carrier.toLowerCase().includes(carrier.toLowerCase()))
        );
      }

      logger.info(
        {
          count: rates.length,
          carriers: carriers,
        },
        'Rates retrieved successfully'
      );
      return rates;
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to get rates');
      throw error;
    }
  }

  /**
   * Get rates by ZIP codes (simplified)
   */
  async getRatesByZip(fromZip: string, toZip: string): Promise<EasyPostRate[]> {
    const fromAddress: EasyPostAddress = {
      name: 'Origin',
      street1: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zip: fromZip,
      country: 'US',
    };

    const toAddress: EasyPostAddress = {
      name: 'Destination',
      street1: '456 Oak Ave',
      city: 'New York',
      state: 'NY',
      zip: toZip,
      country: 'US',
    };

    const parcel: EasyPostParcel = {
      length: 10,
      width: 8,
      height: 4,
      weight: 1,
    };

    return this.getRates(fromAddress, toAddress, parcel);
  }

  /**
   * Create a shipping label
   */
  async createLabel(
    toAddress: EasyPostAddress,
    fromAddress: EasyPostAddress,
    parcel: EasyPostParcel,
    carrier: string,
    service: string,
    customsInfo?: any
  ): Promise<any> {
    if (this.mockMode) {
      return this.getMockLabel(toAddress, fromAddress, parcel, carrier, service);
    }

    try {
      const shipment = await this.createShipment(toAddress, fromAddress, parcel, customsInfo);

      // Find the selected rate
      const selectedRate = shipment.rates.find(
        (rate) =>
          rate.carrier.toLowerCase().includes(carrier.toLowerCase()) &&
          rate.service.toLowerCase().includes(service.toLowerCase())
      );

      if (!selectedRate) {
        throw new Error(`No rate found for carrier ${carrier} and service ${service}`);
      }

      // Buy the shipment
      const response = await this.makeRequest('POST', `/shipments/${shipment.id}/buy`, {
        rate: { id: selectedRate.id },
      });

      logger.info(
        {
          trackingCode: response.tracking_code,
          carrier: response.selected_rate.carrier,
          service: response.selected_rate.service,
        },
        'Label created successfully'
      );

      return {
        tracking_code: response.tracking_code,
        carrier: response.selected_rate.carrier,
        service: response.selected_rate.service,
        rate: response.selected_rate.rate,
        label_url: response.postage_label?.label_url,
      };
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to create label');
      throw error;
    }
  }

  /**
   * Track a shipment
   */
  async trackShipment(trackingCode: string): Promise<EasyPostTracker> {
    if (this.mockMode) {
      return this.getMockTracker(trackingCode);
    }

    try {
      const response = await this.makeRequest('POST', '/trackers', {
        tracker: {
          tracking_code: trackingCode,
        },
      });

      logger.info(
        {
          trackingCode,
          status: response.status,
        },
        'Shipment tracked successfully'
      );

      return response;
    } catch (error) {
      logger.error(
        {
          error: (error as Error).message,
          trackingCode,
        },
        'Failed to track shipment'
      );
      throw error;
    }
  }

  /**
   * Verify an address
   */
  async verifyAddress(address: EasyPostAddress): Promise<EasyPostAddress> {
    if (this.mockMode) {
      return { ...address };
    }

    try {
      const response = await this.makeRequest('POST', '/addresses', {
        address,
      });

      logger.info(
        {
          addressId: response.id,
          verified: response.verifications,
        },
        'Address verified successfully'
      );

      return response;
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to verify address');
      throw error;
    }
  }

  /**
   * Get parcel presets
   */
  async getParcelPresets(): Promise<any[]> {
    if (this.mockMode) {
      return [
        { name: 'Small Box', length: 10, width: 8, height: 4, weight: 1 },
        { name: 'Medium Box', length: 12, width: 10, height: 6, weight: 2 },
        { name: 'Large Box', length: 16, width: 12, height: 8, weight: 3 },
      ];
    }

    try {
      const response = await this.makeRequest('GET', '/parcels');
      logger.info({ count: response.length }, 'Parcel presets retrieved successfully');
      return response;
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to get parcel presets');
      throw error;
    }
  }

  /**
   * Make HTTP request to EasyPost API
   */
  private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
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
          `EasyPost API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
        );
      }

      return await response.json();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error('EasyPost API request timeout');
      }
      throw error;
    }
  }

  /**
   * Mock data for testing
   */
  private getMockShipment(
    toAddress: EasyPostAddress,
    fromAddress: EasyPostAddress,
    parcel: EasyPostParcel
  ): EasyPostShipment {
    return {
      id: 'shp_mock_' + Date.now(),
      object: 'Shipment',
      mode: 'test',
      to_address: toAddress,
      from_address: fromAddress,
      parcel,
      rates: this.getMockRates(toAddress, fromAddress, parcel),
      status: 'unknown',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [],
      options: {},
      is_return: false,
      fees: [],
    };
  }

  private getMockRates(
    _toAddress: EasyPostAddress,
    _fromAddress: EasyPostAddress,
    _parcel: EasyPostParcel,
    carriers?: string[]
  ): EasyPostRate[] {
    const allRates: EasyPostRate[] = [
      {
        id: 'rate_mock_1',
        object: 'Rate',
        mode: 'test',
        service: 'Priority',
        carrier: 'USPS',
        rate: '8.50',
        currency: 'USD',
        retail_rate: '12.00',
        retail_currency: 'USD',
        list_rate: '8.50',
        list_currency: 'USD',
        billing_type: 'easypost',
        delivery_days: 2,
        delivery_date: null,
        delivery_date_guaranteed: false,
        est_delivery_days: 2,
        shipment_id: 'shp_mock',
        carrier_account_id: 'ca_mock',
      },
      {
        id: 'rate_mock_2',
        object: 'Rate',
        mode: 'test',
        service: 'Ground',
        carrier: 'UPS',
        rate: '12.50',
        currency: 'USD',
        retail_rate: '15.00',
        retail_currency: 'USD',
        list_rate: '12.50',
        list_currency: 'USD',
        billing_type: 'easypost',
        delivery_days: 3,
        delivery_date: null,
        delivery_date_guaranteed: false,
        est_delivery_days: 3,
        shipment_id: 'shp_mock',
        carrier_account_id: 'ca_mock',
      },
      {
        id: 'rate_mock_3',
        object: 'Rate',
        mode: 'test',
        service: 'Ground',
        carrier: 'FedEx',
        rate: '14.00',
        currency: 'USD',
        retail_rate: '18.00',
        retail_currency: 'USD',
        list_rate: '14.00',
        list_currency: 'USD',
        billing_type: 'easypost',
        delivery_days: 2,
        delivery_date: null,
        delivery_date_guaranteed: false,
        est_delivery_days: 2,
        shipment_id: 'shp_mock',
        carrier_account_id: 'ca_mock',
      },
    ];

    if (carriers && carriers.length > 0) {
      return allRates.filter((rate) =>
        carriers.some((carrier) => rate.carrier.toLowerCase().includes(carrier.toLowerCase()))
      );
    }

    return allRates;
  }

  private getMockLabel(
    _toAddress: EasyPostAddress,
    _fromAddress: EasyPostAddress,
    _parcel: EasyPostParcel,
    carrier: string,
    service: string
  ): any {
    return {
      tracking_code: '1Z' + Math.random().toString(36).substr(2, 16).toUpperCase(),
      carrier,
      service,
      rate: '12.50',
      label_url:
        'https://easypost-files.s3-us-west-2.amazonaws.com/files/postage_label/20240101/abc123.pdf',
    };
  }

  private getMockTracker(trackingCode: string): EasyPostTracker {
    return {
      id: 'trk_mock_' + Date.now(),
      object: 'Tracker',
      mode: 'test',
      tracking_code: trackingCode,
      status: 'in_transit',
      status_detail: 'in_transit',
      carrier: 'USPS',
      tracking_details: [
        {
          object: 'TrackingDetail',
          message: 'Package picked up',
          status: 'pre_transit',
          status_detail: 'label_created',
          datetime: new Date(Date.now() - 86400000).toISOString(),
          source: 'USPS',
        },
        {
          object: 'TrackingDetail',
          message: 'Package in transit',
          status: 'in_transit',
          status_detail: 'in_transit',
          datetime: new Date().toISOString(),
          source: 'USPS',
        },
      ],
      public_url: `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${trackingCode}`,
      fees: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}
