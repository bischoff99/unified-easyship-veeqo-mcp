/**
 * Enhanced EasyPost Client Implementation
 *
 * Based on EasyPost API documentation research, this client provides
 * comprehensive integration with EasyPost's shipping services.
 */

import { config } from "../../config/index.js";
import {
  CircuitBreaker,
  ErrorCode,
  ErrorCollector,
  createError,
  handleApiError,
} from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";

export interface EasyPostAddress {
  id?: string;
  object?: string;
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
  created_at?: string;
  updated_at?: string;
  mode?: string;
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
  private readonly circuitBreaker: CircuitBreaker;
  private readonly errorCollector: ErrorCollector;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || config.easypost.apiKey;
    this.baseUrl = config.easypost.baseUrl;
    this.timeout = config.easypost.timeout;
    this.mockMode = this.apiKey === "mock" || config.easypost.mockMode;
    this.circuitBreaker = new CircuitBreaker(5, 60000, 30000);
    this.errorCollector = new ErrorCollector(100);

    // Validate API key
    if (!this.apiKey || this.apiKey.trim() === "") {
      throw new Error("EASYPOST_API_KEY is required");
    }

    if (this.mockMode) {
      logger.info("EasyPost client initialized in mock mode");
    } else {
      logger.info("EasyPost client initialized with API key");
    }
  }

  /**
   * Create a shipment with rates
   */
  async createShipment(
    fromAddress: EasyPostAddress,
    toAddress: EasyPostAddress,
    parcel: EasyPostParcel,
    customsInfo?: any
  ): Promise<EasyPostShipment> {
    if (this.mockMode) {
      return this.getMockShipment(fromAddress, toAddress, parcel);
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

      const response = await this.makeRequest(
        "POST",
        "/shipments",
        shipmentData
      );

      logger.info({ shipmentId: response.id }, "Shipment created successfully");
      return response;
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        "Failed to create shipment"
      );
      throw error;
    }
  }

  /**
   * Get shipping rates for a shipment
   */
  async getRates(
    fromAddress: EasyPostAddress,
    toAddress: EasyPostAddress,
    parcel: EasyPostParcel,
    carriers?: string[],
    customsInfo?: any
  ): Promise<EasyPostRate[]> {
    if (this.mockMode) {
      return this.getMockRates(fromAddress, toAddress, parcel, carriers);
    }

    try {
      const shipment = await this.createShipment(
        fromAddress,
        toAddress,
        parcel,
        customsInfo
      );

      // Filter rates by carriers if specified
      let rates = shipment.rates;
      if (carriers && carriers.length > 0) {
        rates = rates.filter((rate) =>
          carriers.some((carrier) =>
            rate.carrier.toLowerCase().includes(carrier.toLowerCase())
          )
        );
      }

      logger.info(
        {
          count: rates.length,
          carriers: carriers,
        },
        "Rates retrieved successfully"
      );
      return rates;
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Failed to get rates");
      throw error;
    }
  }

  /**
   * Get rates by ZIP codes (simplified)
   */
  async getRatesByZip(fromZip: string, toZip: string): Promise<EasyPostRate[]> {
    const fromAddress: EasyPostAddress = {
      name: "Origin",
      street1: "123 Main St",
      city: "San Francisco",
      state: "CA",
      zip: fromZip,
      country: "US",
    };

    const toAddress: EasyPostAddress = {
      name: "Destination",
      street1: "456 Oak Ave",
      city: "New York",
      state: "NY",
      zip: toZip,
      country: "US",
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
    fromAddress: EasyPostAddress,
    toAddress: EasyPostAddress,
    parcel: EasyPostParcel,
    carrier: string,
    service: string,
    customsInfo?: any
  ): Promise<any> {
    if (this.mockMode) {
      return this.getMockLabel(
        fromAddress,
        toAddress,
        parcel,
        carrier,
        service
      );
    }

    try {
      const shipment = await this.createShipment(
        fromAddress,
        toAddress,
        parcel,
        customsInfo
      );

      // Find the selected rate
      const selectedRate = shipment.rates.find(
        (rate) =>
          rate.carrier.toLowerCase().includes(carrier.toLowerCase()) &&
          rate.service.toLowerCase().includes(service.toLowerCase())
      );

      if (!selectedRate) {
        throw new Error(
          `No rate found for carrier ${carrier} and service ${service}`
        );
      }

      // Buy the shipment
      const response = await this.makeRequest(
        "POST",
        `/shipments/${shipment.id}/buy`,
        {
          rate: { id: selectedRate.id },
        }
      );

      logger.info(
        {
          trackingCode: response.tracking_code,
          carrier: response.selected_rate.carrier,
          service: response.selected_rate.service,
        },
        "Label created successfully"
      );

      return {
        tracking_code: response.tracking_code,
        carrier: response.selected_rate.carrier,
        service: response.selected_rate.service,
        rate: response.selected_rate.rate,
        label_url: response.postage_label?.label_url,
      };
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        "Failed to create label"
      );
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
      const response = await this.makeRequest("POST", "/trackers", {
        tracker: {
          tracking_code: trackingCode,
        },
      });

      logger.info(
        {
          trackingCode,
          status: response.status,
        },
        "Shipment tracked successfully"
      );

      return response;
    } catch (error) {
      logger.error(
        {
          error: (error as Error).message,
          trackingCode,
        },
        "Failed to track shipment"
      );
      throw error;
    }
  }

  /**
   * Track a package (alias for trackShipment)
   */
  async trackPackage(trackingCode: string): Promise<EasyPostTracker> {
    return this.trackShipment(trackingCode);
  }

  /**
   * Verify an address
   */
  async verifyAddress(address: EasyPostAddress): Promise<EasyPostAddress> {
    if (this.mockMode) {
      return { ...address };
    }

    try {
      const response = await this.makeRequest("POST", "/addresses", {
        address,
      });

      logger.info(
        {
          addressId: response.id,
          verified: response.verifications,
        },
        "Address verified successfully"
      );

      return response;
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        "Failed to verify address"
      );
      throw error;
    }
  }

  /**
   * Get parcel presets
   */
  async getParcelPresets(_carrier?: string): Promise<any[]> {
    if (this.mockMode) {
      return [
        { name: "Small Box", length: 10, width: 8, height: 4, weight: 1 },
        { name: "Medium Box", length: 12, width: 10, height: 6, weight: 2 },
        { name: "Large Box", length: 16, width: 12, height: 8, weight: 3 },
      ];
    }

    try {
      const response = await this.makeRequest("GET", "/parcels");
      logger.info(
        { count: response.length },
        "Parcel presets retrieved successfully"
      );
      return response;
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        "Failed to get parcel presets"
      );
      throw error;
    }
  }

  /**
   * Make HTTP request to EasyPost API with enhanced error handling
   */
  private async makeRequest(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<any> {
    return this.circuitBreaker.execute(() =>
      this._makeRequestInternal(method, endpoint, data)
    );
  }

  private async _makeRequestInternal(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`,
      "Content-Type": "application/json",
      "User-Agent": "Unified-EasyPost-Veeqo-MCP/1.0.0",
    };

    const options: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    if (data && (method === "POST" || method === "PUT")) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as any;

        // For test mocks, extract the error message directly
        let errorMessage = "Unknown error";
        if (errorData && errorData.error && errorData.error.message) {
          errorMessage = errorData.error.message;
        } else if (errorData && errorData.message) {
          errorMessage = errorData.message;
        } else if (typeof errorData === "string") {
          errorMessage = errorData;
        }

        // Create a simple error for test compatibility
        const apiError = createError(
          ErrorCode.API_ERROR,
          `${errorMessage}`,
          { status: response.status, service: "easypost" },
          response.status
        );

        this.errorCollector.add(apiError);
        throw apiError;
      }

      return await response.json();
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        const timeoutError = createError(ErrorCode.TIMEOUT, "Request timeout", {
          endpoint,
          method,
          timeout: this.timeout,
        });
        this.errorCollector.add(timeoutError);
        throw timeoutError;
      }

      // Handle network timeouts with specific message
      if (
        (error as Error).message?.includes("timeout") ||
        (error as Error).message?.includes("Request timeout")
      ) {
        const timeoutError = createError(ErrorCode.TIMEOUT, "Request timeout", {
          endpoint,
          method,
          timeout: this.timeout,
        });
        this.errorCollector.add(timeoutError);
        throw timeoutError;
      }

      // Handle network and other errors
      const mcpError = handleApiError(error, "easypost");
      this.errorCollector.add(mcpError);
      throw mcpError;
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
      id: "shp_mock_" + Date.now(),
      object: "Shipment",
      mode: "test",
      to_address: toAddress,
      from_address: fromAddress,
      parcel,
      rates: this.getMockRates(toAddress, fromAddress, parcel),
      status: "unknown",
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
        id: "rate_mock_1",
        object: "Rate",
        mode: "test",
        service: "Priority",
        carrier: "USPS",
        rate: "8.50",
        currency: "USD",
        retail_rate: "12.00",
        retail_currency: "USD",
        list_rate: "8.50",
        list_currency: "USD",
        billing_type: "easypost",
        delivery_days: 2,
        delivery_date: null,
        delivery_date_guaranteed: false,
        est_delivery_days: 2,
        shipment_id: "shp_mock",
        carrier_account_id: "ca_mock",
      },
      {
        id: "rate_mock_2",
        object: "Rate",
        mode: "test",
        service: "Ground",
        carrier: "UPS",
        rate: "12.50",
        currency: "USD",
        retail_rate: "15.00",
        retail_currency: "USD",
        list_rate: "12.50",
        list_currency: "USD",
        billing_type: "easypost",
        delivery_days: 3,
        delivery_date: null,
        delivery_date_guaranteed: false,
        est_delivery_days: 3,
        shipment_id: "shp_mock",
        carrier_account_id: "ca_mock",
      },
      {
        id: "rate_mock_3",
        object: "Rate",
        mode: "test",
        service: "Ground",
        carrier: "FedEx",
        rate: "14.00",
        currency: "USD",
        retail_rate: "18.00",
        retail_currency: "USD",
        list_rate: "14.00",
        list_currency: "USD",
        billing_type: "easypost",
        delivery_days: 2,
        delivery_date: null,
        delivery_date_guaranteed: false,
        est_delivery_days: 2,
        shipment_id: "shp_mock",
        carrier_account_id: "ca_mock",
      },
    ];

    if (carriers && carriers.length > 0) {
      return allRates.filter((rate) =>
        carriers.some((carrier) =>
          rate.carrier.toLowerCase().includes(carrier.toLowerCase())
        )
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
      tracking_code:
        "1Z" + Math.random().toString(36).substr(2, 16).toUpperCase(),
      carrier,
      service,
      rate: "12.50",
      label_url:
        "https://easypost-files.s3-us-west-2.amazonaws.com/files/postage_label/20240101/abc123.pdf",
    };
  }

  private getMockTracker(trackingCode: string): EasyPostTracker {
    return {
      id: "trk_mock_" + Date.now(),
      object: "Tracker",
      mode: "test",
      tracking_code: trackingCode,
      status: "in_transit",
      status_detail: "in_transit",
      carrier: "USPS",
      tracking_details: [
        {
          object: "TrackingDetail",
          message: "Package picked up",
          status: "pre_transit",
          status_detail: "label_created",
          datetime: new Date(Date.now() - 86400000).toISOString(),
          source: "USPS",
        },
        {
          object: "TrackingDetail",
          message: "Package in transit",
          status: "in_transit",
          status_detail: "in_transit",
          datetime: new Date().toISOString(),
          source: "USPS",
        },
      ],
      public_url: `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${trackingCode}`,
      fees: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // ============================================================================
  // ENHANCED CARRIER SUPPORT
  // ============================================================================

  /**
   * Get list of available carriers and their services
   */
  async getCarriers(): Promise<CarrierInfo[]> {
    if (this.mockMode) {
      return this.getMockCarriers();
    }

    try {
      const response = await this.makeRequest("GET", "/carriers");
      logger.info(
        { carrierCount: response.length },
        "Retrieved available carriers"
      );
      return response;
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        "Failed to fetch carriers"
      );
      throw error;
    }
  }

  /**
   * Get rates from specific carriers
   */
  async getRatesByCarriers(
    fromAddress: EasyPostAddress,
    toAddress: EasyPostAddress,
    parcel: EasyPostParcel,
    carrierNames: string[] = ["USPS", "UPS", "FedEx", "DHL"],
    customsInfo?: any
  ): Promise<EasyPostRate[]> {
    if (this.mockMode) {
      return this.getMockRatesByCarriers(carrierNames);
    }

    try {
      const shipment = await this.createShipment(
        fromAddress,
        toAddress,
        parcel,
        customsInfo
      );

      // Filter rates by requested carriers
      const filteredRates = shipment.rates.filter((rate) =>
        carrierNames.includes(rate.carrier.toUpperCase())
      );

      logger.info(
        {
          requestedCarriers: carrierNames,
          foundRates: filteredRates.length,
          totalRates: shipment.rates.length,
        },
        "Retrieved carrier-specific rates"
      );

      return filteredRates;
    } catch (error) {
      logger.error(
        {
          error: (error as Error).message,
          carriers: carrierNames,
        },
        "Failed to get rates by carriers"
      );
      throw error;
    }
  }

  /**
   * Get international shipping rates
   */
  async getInternationalRates(
    toAddress: EasyPostAddress,
    fromAddress: EasyPostAddress,
    parcel: EasyPostParcel,
    customsInfo?: EasyPostCustomsInfo
  ): Promise<EasyPostRate[]> {
    if (this.mockMode) {
      return this.getMockInternationalRates();
    }

    try {
      const shipmentData: any = {
        to_address: toAddress,
        from_address: fromAddress,
        parcel: parcel,
        options: {
          international: true,
        },
      };

      if (customsInfo) {
        shipmentData.customs_info = customsInfo;
      }

      const response = await this.makeRequest(
        "POST",
        "/shipments",
        shipmentData
      );

      // Filter for international services
      const internationalRates = response.rates.filter(
        (rate: EasyPostRate) =>
          rate.service.toLowerCase().includes("international") ||
          rate.service.toLowerCase().includes("express") ||
          toAddress.country !== fromAddress.country
      );

      logger.info(
        {
          destination: toAddress.country,
          origin: fromAddress.country,
          internationalRates: internationalRates.length,
          totalRates: response.rates.length,
        },
        "Retrieved international shipping rates"
      );

      return internationalRates;
    } catch (error) {
      logger.error(
        {
          error: (error as Error).message,
          destination: toAddress.country,
        },
        "Failed to get international rates"
      );
      throw error;
    }
  }

  /**
   * Get carrier account information
   */
  async getCarrierAccounts(): Promise<CarrierAccount[]> {
    if (this.mockMode) {
      return this.getMockCarrierAccounts();
    }

    try {
      const response = await this.makeRequest("GET", "/carrier_accounts");
      logger.info(
        { accountCount: response.length },
        "Retrieved carrier accounts"
      );
      return response;
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        "Failed to fetch carrier accounts"
      );
      throw error;
    }
  }

  /**
   * Get all addresses from EasyPost
   */
  async getAddresses(): Promise<EasyPostAddress[]> {
    if (this.mockMode) {
      return this.getMockAddresses();
    }

    try {
      const response = await this.makeRequest("GET", "/addresses");
      const addresses = response.addresses || response;
      logger.info(
        { addressCount: addresses.length },
        "Retrieved addresses from EasyPost"
      );
      return addresses;
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        "Failed to fetch addresses"
      );
      throw error;
    }
  }

  /**
   * Purchase a shipment with specific carrier
   */
  async purchaseShipmentWithCarrier(
    shipmentId: string,
    carrier: string,
    service: string
  ): Promise<EasyPostShipment> {
    if (this.mockMode) {
      return this.getMockPurchasedShipment(carrier, service);
    }

    try {
      // Find the rate for the specific carrier and service
      const shipment = await this.makeRequest(
        "GET",
        `/shipments/${shipmentId}`
      );

      const targetRate = shipment.rates.find(
        (rate: EasyPostRate) =>
          rate.carrier.toUpperCase() === carrier.toUpperCase() &&
          rate.service.toLowerCase() === service.toLowerCase()
      );

      if (!targetRate) {
        throw new Error(`Rate not found for ${carrier} ${service}`);
      }

      const response = await this.makeRequest(
        "POST",
        `/shipments/${shipmentId}/buy`,
        {
          rate: targetRate,
        }
      );

      logger.info(
        {
          shipmentId: response.id,
          carrier: response.selected_rate.carrier,
          service: response.selected_rate.service,
          cost: response.selected_rate.rate,
        },
        "Shipment purchased successfully"
      );

      return response;
    } catch (error) {
      logger.error(
        {
          error: (error as Error).message,
          shipmentId,
          carrier,
          service,
        },
        "Failed to purchase shipment"
      );
      throw error;
    }
  }

  // ============================================================================
  // MOCK DATA FOR ENHANCED CARRIER SUPPORT
  // ============================================================================

  private getMockCarriers(): CarrierInfo[] {
    return [
      {
        name: "USPS",
        full_name: "United States Postal Service",
        services: [
          "Priority",
          "Express",
          "Ground",
          "Priority Express International",
        ],
        countries: ["US", "International"],
      },
      {
        name: "UPS",
        full_name: "United Parcel Service",
        services: [
          "Ground",
          "Next Day Air",
          "2nd Day Air",
          "Worldwide Express",
        ],
        countries: ["US", "International"],
      },
      {
        name: "FedEx",
        full_name: "Federal Express",
        services: [
          "Ground",
          "Express Saver",
          "Standard Overnight",
          "International Priority",
        ],
        countries: ["US", "International"],
      },
      {
        name: "DHL",
        full_name: "DHL Express",
        services: [
          "Express Worldwide",
          "Express 12:00",
          "Express 9:00",
          "Economy Select",
        ],
        countries: ["International"],
      },
    ];
  }

  private getMockRatesByCarriers(carrierNames: string[]): EasyPostRate[] {
    const allRates = [
      {
        id: "rate_usps_priority",
        object: "Rate",
        mode: "test",
        service: "Priority",
        carrier: "USPS",
        rate: "8.50",
        currency: "USD",
        retail_rate: "12.00",
        retail_currency: "USD",
        list_rate: "8.50",
        list_currency: "USD",
        billing_type: "easypost",
        delivery_days: 2,
        delivery_date: null,
        delivery_date_guaranteed: false,
        est_delivery_days: 2,
        shipment_id: "shp_mock_001",
        carrier_account_id: "ca_usps_001",
      },
      {
        id: "rate_ups_ground",
        object: "Rate",
        mode: "test",
        service: "Ground",
        carrier: "UPS",
        rate: "12.50",
        currency: "USD",
        retail_rate: "15.00",
        retail_currency: "USD",
        list_rate: "12.50",
        list_currency: "USD",
        billing_type: "easypost",
        delivery_days: 3,
        delivery_date: null,
        delivery_date_guaranteed: false,
        est_delivery_days: 3,
        shipment_id: "shp_mock_001",
        carrier_account_id: "ca_ups_001",
      },
      {
        id: "rate_fedex_ground",
        object: "Rate",
        mode: "test",
        service: "Ground",
        carrier: "FedEx",
        rate: "14.00",
        currency: "USD",
        retail_rate: "18.00",
        retail_currency: "USD",
        list_rate: "14.00",
        list_currency: "USD",
        billing_type: "easypost",
        delivery_days: 4,
        delivery_date: null,
        delivery_date_guaranteed: false,
        est_delivery_days: 4,
        shipment_id: "shp_mock_001",
        carrier_account_id: "ca_fedex_001",
      },
      {
        id: "rate_dhl_express",
        object: "Rate",
        mode: "test",
        service: "Express Worldwide",
        carrier: "DHL",
        rate: "35.00",
        currency: "USD",
        retail_rate: "42.00",
        retail_currency: "USD",
        list_rate: "35.00",
        list_currency: "USD",
        billing_type: "easypost",
        delivery_days: 2,
        delivery_date: null,
        delivery_date_guaranteed: true,
        est_delivery_days: 2,
        shipment_id: "shp_mock_001",
        carrier_account_id: "ca_dhl_001",
      },
    ];

    return allRates.filter((rate) =>
      carrierNames.some(
        (carrier) => carrier.toUpperCase() === rate.carrier.toUpperCase()
      )
    );
  }

  private getMockInternationalRates(): EasyPostRate[] {
    return [
      {
        id: "rate_usps_intl",
        object: "Rate",
        mode: "test",
        service: "Priority Mail International",
        carrier: "USPS",
        rate: "28.50",
        currency: "USD",
        retail_rate: "35.00",
        retail_currency: "USD",
        list_rate: "28.50",
        list_currency: "USD",
        billing_type: "easypost",
        delivery_days: 7,
        delivery_date: null,
        delivery_date_guaranteed: false,
        est_delivery_days: 7,
        shipment_id: "shp_mock_intl_001",
        carrier_account_id: "ca_usps_001",
      },
      {
        id: "rate_fedex_intl_priority",
        object: "Rate",
        mode: "test",
        service: "International Priority",
        carrier: "FedEx",
        rate: "54.67",
        currency: "USD",
        retail_rate: "62.00",
        retail_currency: "USD",
        list_rate: "54.67",
        list_currency: "USD",
        billing_type: "easypost",
        delivery_days: 4,
        delivery_date: null,
        delivery_date_guaranteed: true,
        est_delivery_days: 4,
        shipment_id: "shp_mock_intl_001",
        carrier_account_id: "ca_fedex_001",
      },
      {
        id: "rate_fedex_intl_economy",
        object: "Rate",
        mode: "test",
        service: "International Economy",
        carrier: "FedEx",
        rate: "48.25",
        currency: "USD",
        retail_rate: "55.00",
        retail_currency: "USD",
        list_rate: "48.25",
        list_currency: "USD",
        billing_type: "easypost",
        delivery_days: 6,
        delivery_date: null,
        delivery_date_guaranteed: false,
        est_delivery_days: 6,
        shipment_id: "shp_mock_intl_001",
        carrier_account_id: "ca_fedex_001",
      },
      {
        id: "rate_dhl_intl",
        object: "Rate",
        mode: "test",
        service: "Express Worldwide",
        carrier: "DHL",
        rate: "45.00",
        currency: "USD",
        retail_rate: "52.00",
        retail_currency: "USD",
        list_rate: "45.00",
        list_currency: "USD",
        billing_type: "easypost",
        delivery_days: 3,
        delivery_date: null,
        delivery_date_guaranteed: true,
        est_delivery_days: 3,
        shipment_id: "shp_mock_intl_001",
        carrier_account_id: "ca_dhl_001",
      },
    ];
  }

  private getMockCarrierAccounts(): CarrierAccount[] {
    return [
      {
        id: "ca_usps_001",
        object: "CarrierAccount",
        type: "UspsAccount",
        clone: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: "USPS Account",
        reference: "usps_primary",
        readable: "USPS (Primary)",
        logo: "https://assets.easypost.com/carriers/usps.png",
        fields: {
          visibility: "visible",
        },
        credentials: {},
        test_credentials: {},
      },
      {
        id: "ca_ups_001",
        object: "CarrierAccount",
        type: "UpsAccount",
        clone: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: "UPS Account",
        reference: "ups_primary",
        readable: "UPS (Primary)",
        logo: "https://assets.easypost.com/carriers/ups.png",
        fields: {
          visibility: "visible",
        },
        credentials: {},
        test_credentials: {},
      },
    ];
  }

  private getMockAddresses(): EasyPostAddress[] {
    return [
      {
        id: "addr_ca_001",
        object: "Address",
        name: "California Warehouse",
        street1: "123 Commerce Way",
        street2: "Suite 100",
        city: "Los Angeles",
        state: "CA",
        zip: "90210",
        country: "US",
        phone: "+1-555-123-4567",
        email: "warehouse@company.com",
        company: "Company Inc",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        mode: "test",
      },
      {
        id: "addr_tx_001",
        object: "Address",
        name: "Texas Warehouse",
        street1: "456 Industrial Blvd",
        street2: "Building A",
        city: "Houston",
        state: "TX",
        zip: "77001",
        country: "US",
        phone: "+1-555-234-5678",
        email: "texas@company.com",
        company: "Company Inc",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        mode: "test",
      },
      {
        id: "addr_ny_001",
        object: "Address",
        name: "New York Warehouse",
        street1: "789 Business Park",
        street2: "Unit 200",
        city: "New York",
        state: "NY",
        zip: "10001",
        country: "US",
        phone: "+1-555-345-6789",
        email: "ny@company.com",
        company: "Company Inc",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        mode: "test",
      },
      {
        id: "addr_fl_001",
        object: "Address",
        name: "Florida Warehouse",
        street1: "321 Distribution Center",
        street2: "Suite 150",
        city: "Miami",
        state: "FL",
        zip: "33101",
        country: "US",
        phone: "+1-555-456-7890",
        email: "florida@company.com",
        company: "Company Inc",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        mode: "test",
      },
    ];
  }

  private getMockPurchasedShipment(
    carrier: string,
    service: string
  ): EasyPostShipment {
    return {
      id: `shp_${carrier.toLowerCase()}_${Date.now()}`,
      object: "Shipment",
      mode: "test",
      to_address: {
        name: "John Doe",
        street1: "123 Main St",
        city: "San Francisco",
        state: "CA",
        zip: "94105",
        country: "US",
        phone: "5551234567",
        email: "john@example.com",
      },
      from_address: {
        name: "Jane Smith",
        company: "Acme Corp",
        street1: "456 Oak Ave",
        city: "New York",
        state: "NY",
        zip: "10001",
        country: "US",
        phone: "5555678901",
        email: "jane@acme.com",
      },
      parcel: {
        length: 10.0,
        width: 8.0,
        height: 4.0,
        weight: 15.0,
      },
      rates: [],
      selected_rate: {
        id: `rate_${carrier.toLowerCase()}_selected`,
        object: "Rate",
        mode: "test",
        service: service,
        carrier: carrier,
        rate: "25.00",
        currency: "USD",
        retail_rate: "30.00",
        retail_currency: "USD",
        list_rate: "25.00",
        list_currency: "USD",
        billing_type: "easypost",
        delivery_days: 3,
        delivery_date: null,
        delivery_date_guaranteed: false,
        est_delivery_days: 3,
        shipment_id: `shp_${carrier.toLowerCase()}_${Date.now()}`,
        carrier_account_id: `ca_${carrier.toLowerCase()}_001`,
      },
      postage_label: {
        id: `pl_${carrier.toLowerCase()}_${Date.now()}`,
        object: "PostageLabel",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        date_advance: 0,
        integrated_form: "none",
        label_date: new Date().toISOString(),
        label_resolution: 300,
        label_size: "4x6",
        label_type: "default",
        label_file_type: "image/png",
        label_url: `https://easypost-files.s3-us-west-2.amazonaws.com/files/postage_label/mock_${Date.now()}.png`,
        label_pdf_url: null,
        label_zpl_url: null,
        label_epl2_url: null,
      },
      tracking_code: `${carrier.toUpperCase()}${Math.random().toString().substring(2, 12)}`,
      status: "purchased",
      messages: [],
      options: {},
      is_return: false,
      forms: [],
      fees: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

// ============================================================================
// ENHANCED CARRIER INTERFACES
// ============================================================================

export interface CarrierInfo {
  name: string;
  full_name: string;
  services: string[];
  countries: string[];
}

export interface CarrierAccount {
  id: string;
  object: string;
  type: string;
  clone: boolean;
  created_at: string;
  updated_at: string;
  description: string;
  reference: string;
  readable: string;
  logo: string;
  fields: {
    visibility: string;
  };
  credentials: Record<string, any>;
  test_credentials: Record<string, any>;
}

export interface EasyPostCustomsInfo {
  id?: string;
  object?: string;
  customs_certify: boolean;
  customs_signer: string;
  contents_type:
    | "merchandise"
    | "documents"
    | "gift"
    | "returned_goods"
    | "sample"
    | "other";
  contents_explanation?: string;
  restriction_type?:
    | "none"
    | "other"
    | "quarantine"
    | "sanitary_phytosanitary_inspection";
  restriction_comments?: string;
  non_delivery_option?: "return" | "abandon";
  customs_items: EasyPostCustomsItem[];
  eel_pfc?: string;
}

export interface EasyPostCustomsItem {
  id?: string;
  object?: string;
  description: string;
  quantity: number;
  weight: number;
  value: number;
  hs_tariff_number?: string;
  code?: string;
  origin_country: string;
  currency?: string;
}
