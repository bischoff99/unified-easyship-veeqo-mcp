/**
 * Enhanced EasyPost Client Implementation
 *
 * Based on EasyPost API documentation research, this client provides
 * comprehensive integration with EasyPost's shipping services.
 */
import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";
import { CircuitBreaker, ErrorCollector, handleApiError, createError, ErrorCode, } from "../../utils/errors.js";
export class EasyPostClient {
    apiKey;
    baseUrl;
    timeout;
    mockMode;
    circuitBreaker;
    errorCollector;
    constructor(apiKey) {
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
        }
        else {
            logger.info("EasyPost client initialized with API key");
        }
    }
    /**
     * Create a shipment with rates
     */
    async createShipment(toAddress, fromAddress, parcel, customsInfo) {
        if (this.mockMode) {
            return this.getMockShipment(toAddress, fromAddress, parcel);
        }
        try {
            const shipmentData = {
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
            const response = await this.makeRequest("POST", "/shipments", shipmentData);
            logger.info({ shipmentId: response.id }, "Shipment created successfully");
            return response;
        }
        catch (error) {
            logger.error({ error: error.message }, "Failed to create shipment");
            throw error;
        }
    }
    /**
     * Get shipping rates for a shipment
     */
    async getRates(toAddress, fromAddress, parcel, carriers, customsInfo) {
        if (this.mockMode) {
            return this.getMockRates(toAddress, fromAddress, parcel, carriers);
        }
        try {
            const shipment = await this.createShipment(toAddress, fromAddress, parcel, customsInfo);
            // Filter rates by carriers if specified
            let rates = shipment.rates;
            if (carriers && carriers.length > 0) {
                rates = rates.filter((rate) => carriers.some((carrier) => rate.carrier.toLowerCase().includes(carrier.toLowerCase())));
            }
            logger.info({
                count: rates.length,
                carriers: carriers,
            }, "Rates retrieved successfully");
            return rates;
        }
        catch (error) {
            logger.error({ error: error.message }, "Failed to get rates");
            throw error;
        }
    }
    /**
     * Get rates by ZIP codes (simplified)
     */
    async getRatesByZip(fromZip, toZip) {
        const fromAddress = {
            name: "Origin",
            street1: "123 Main St",
            city: "San Francisco",
            state: "CA",
            zip: fromZip,
            country: "US",
        };
        const toAddress = {
            name: "Destination",
            street1: "456 Oak Ave",
            city: "New York",
            state: "NY",
            zip: toZip,
            country: "US",
        };
        const parcel = {
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
    async createLabel(toAddress, fromAddress, parcel, carrier, service, customsInfo) {
        if (this.mockMode) {
            return this.getMockLabel(toAddress, fromAddress, parcel, carrier, service);
        }
        try {
            const shipment = await this.createShipment(toAddress, fromAddress, parcel, customsInfo);
            // Find the selected rate
            const selectedRate = shipment.rates.find((rate) => rate.carrier.toLowerCase().includes(carrier.toLowerCase()) &&
                rate.service.toLowerCase().includes(service.toLowerCase()));
            if (!selectedRate) {
                throw new Error(`No rate found for carrier ${carrier} and service ${service}`);
            }
            // Buy the shipment
            const response = await this.makeRequest("POST", `/shipments/${shipment.id}/buy`, {
                rate: { id: selectedRate.id },
            });
            logger.info({
                trackingCode: response.tracking_code,
                carrier: response.selected_rate.carrier,
                service: response.selected_rate.service,
            }, "Label created successfully");
            return {
                tracking_code: response.tracking_code,
                carrier: response.selected_rate.carrier,
                service: response.selected_rate.service,
                rate: response.selected_rate.rate,
                label_url: response.postage_label?.label_url,
            };
        }
        catch (error) {
            logger.error({ error: error.message }, "Failed to create label");
            throw error;
        }
    }
    /**
     * Track a shipment
     */
    async trackShipment(trackingCode) {
        if (this.mockMode) {
            return this.getMockTracker(trackingCode);
        }
        try {
            const response = await this.makeRequest("POST", "/trackers", {
                tracker: {
                    tracking_code: trackingCode,
                },
            });
            logger.info({
                trackingCode,
                status: response.status,
            }, "Shipment tracked successfully");
            return response;
        }
        catch (error) {
            logger.error({
                error: error.message,
                trackingCode,
            }, "Failed to track shipment");
            throw error;
        }
    }
    /**
     * Track a package (alias for trackShipment)
     */
    async trackPackage(trackingCode) {
        return this.trackShipment(trackingCode);
    }
    /**
     * Verify an address
     */
    async verifyAddress(address) {
        if (this.mockMode) {
            return { ...address };
        }
        try {
            const response = await this.makeRequest("POST", "/addresses", {
                address,
            });
            logger.info({
                addressId: response.id,
                verified: response.verifications,
            }, "Address verified successfully");
            return response;
        }
        catch (error) {
            logger.error({ error: error.message }, "Failed to verify address");
            throw error;
        }
    }
    /**
     * Get parcel presets
     */
    async getParcelPresets(_carrier) {
        if (this.mockMode) {
            return [
                { name: "Small Box", length: 10, width: 8, height: 4, weight: 1 },
                { name: "Medium Box", length: 12, width: 10, height: 6, weight: 2 },
                { name: "Large Box", length: 16, width: 12, height: 8, weight: 3 },
            ];
        }
        try {
            const response = await this.makeRequest("GET", "/parcels");
            logger.info({ count: response.length }, "Parcel presets retrieved successfully");
            return response;
        }
        catch (error) {
            logger.error({ error: error.message }, "Failed to get parcel presets");
            throw error;
        }
    }
    /**
     * Make HTTP request to EasyPost API with enhanced error handling
     */
    async makeRequest(method, endpoint, data) {
        return this.circuitBreaker.execute(() => this._makeRequestInternal(method, endpoint, data));
    }
    async _makeRequestInternal(method, endpoint, data) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            Authorization: `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`,
            "Content-Type": "application/json",
            "User-Agent": "Unified-EasyPost-Veeqo-MCP/1.0.0",
        };
        const options = {
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
                const errorData = (await response.json().catch(() => ({})));
                // For test mocks, extract the error message directly
                let errorMessage = "Unknown error";
                if (errorData && errorData.error && errorData.error.message) {
                    errorMessage = errorData.error.message;
                }
                else if (errorData && errorData.message) {
                    errorMessage = errorData.message;
                }
                else if (typeof errorData === "string") {
                    errorMessage = errorData;
                }
                // Create a simple error for test compatibility
                const apiError = createError(ErrorCode.API_ERROR, `${errorMessage}`, { status: response.status, service: "easypost" }, response.status);
                this.errorCollector.add(apiError);
                throw apiError;
            }
            return await response.json();
        }
        catch (error) {
            if (error.name === "AbortError") {
                const timeoutError = createError(ErrorCode.TIMEOUT, "Request timeout", {
                    endpoint,
                    method,
                    timeout: this.timeout,
                });
                this.errorCollector.add(timeoutError);
                throw timeoutError;
            }
            // Handle network timeouts with specific message
            if (error.message?.includes("timeout") ||
                error.message?.includes("Request timeout")) {
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
    getMockShipment(toAddress, fromAddress, parcel) {
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
    getMockRates(_toAddress, _fromAddress, _parcel, carriers) {
        const allRates = [
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
            return allRates.filter((rate) => carriers.some((carrier) => rate.carrier.toLowerCase().includes(carrier.toLowerCase())));
        }
        return allRates;
    }
    getMockLabel(_toAddress, _fromAddress, _parcel, carrier, service) {
        return {
            tracking_code: "1Z" + Math.random().toString(36).substr(2, 16).toUpperCase(),
            carrier,
            service,
            rate: "12.50",
            label_url: "https://easypost-files.s3-us-west-2.amazonaws.com/files/postage_label/20240101/abc123.pdf",
        };
    }
    getMockTracker(trackingCode) {
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
    async getCarriers() {
        if (this.mockMode) {
            return this.getMockCarriers();
        }
        try {
            const response = await this.makeRequest("GET", "/carriers");
            logger.info({ carrierCount: response.length }, "Retrieved available carriers");
            return response;
        }
        catch (error) {
            logger.error({ error: error.message }, "Failed to fetch carriers");
            throw error;
        }
    }
    /**
     * Get rates from specific carriers
     */
    async getRatesByCarriers(toAddress, fromAddress, parcel, carrierNames = ["USPS", "UPS", "FedEx", "DHL"], customsInfo) {
        if (this.mockMode) {
            return this.getMockRatesByCarriers(carrierNames);
        }
        try {
            const shipment = await this.createShipment(toAddress, fromAddress, parcel, customsInfo);
            // Filter rates by requested carriers
            const filteredRates = shipment.rates.filter((rate) => carrierNames.includes(rate.carrier.toUpperCase()));
            logger.info({
                requestedCarriers: carrierNames,
                foundRates: filteredRates.length,
                totalRates: shipment.rates.length,
            }, "Retrieved carrier-specific rates");
            return filteredRates;
        }
        catch (error) {
            logger.error({
                error: error.message,
                carriers: carrierNames,
            }, "Failed to get rates by carriers");
            throw error;
        }
    }
    /**
     * Get international shipping rates
     */
    async getInternationalRates(toAddress, fromAddress, parcel, customsInfo) {
        if (this.mockMode) {
            return this.getMockInternationalRates();
        }
        try {
            const shipmentData = {
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
            const response = await this.makeRequest("POST", "/shipments", shipmentData);
            // Filter for international services
            const internationalRates = response.rates.filter((rate) => rate.service.toLowerCase().includes("international") ||
                rate.service.toLowerCase().includes("express") ||
                toAddress.country !== fromAddress.country);
            logger.info({
                destination: toAddress.country,
                origin: fromAddress.country,
                internationalRates: internationalRates.length,
                totalRates: response.rates.length,
            }, "Retrieved international shipping rates");
            return internationalRates;
        }
        catch (error) {
            logger.error({
                error: error.message,
                destination: toAddress.country,
            }, "Failed to get international rates");
            throw error;
        }
    }
    /**
     * Get carrier account information
     */
    async getCarrierAccounts() {
        if (this.mockMode) {
            return this.getMockCarrierAccounts();
        }
        try {
            const response = await this.makeRequest("GET", "/carrier_accounts");
            logger.info({ accountCount: response.length }, "Retrieved carrier accounts");
            return response;
        }
        catch (error) {
            logger.error({ error: error.message }, "Failed to fetch carrier accounts");
            throw error;
        }
    }
    /**
     * Get all addresses from EasyPost
     */
    async getAddresses() {
        if (this.mockMode) {
            return this.getMockAddresses();
        }
        try {
            const response = await this.makeRequest("GET", "/addresses");
            const addresses = response.addresses || response;
            logger.info({ addressCount: addresses.length }, "Retrieved addresses from EasyPost");
            return addresses;
        }
        catch (error) {
            logger.error({ error: error.message }, "Failed to fetch addresses");
            throw error;
        }
    }
    /**
     * Purchase a shipment with specific carrier
     */
    async purchaseShipmentWithCarrier(shipmentId, carrier, service) {
        if (this.mockMode) {
            return this.getMockPurchasedShipment(carrier, service);
        }
        try {
            // Find the rate for the specific carrier and service
            const shipment = await this.makeRequest("GET", `/shipments/${shipmentId}`);
            const targetRate = shipment.rates.find((rate) => rate.carrier.toUpperCase() === carrier.toUpperCase() &&
                rate.service.toLowerCase() === service.toLowerCase());
            if (!targetRate) {
                throw new Error(`Rate not found for ${carrier} ${service}`);
            }
            const response = await this.makeRequest("POST", `/shipments/${shipmentId}/buy`, {
                rate: targetRate,
            });
            logger.info({
                shipmentId: response.id,
                carrier: response.selected_rate.carrier,
                service: response.selected_rate.service,
                cost: response.selected_rate.rate,
            }, "Shipment purchased successfully");
            return response;
        }
        catch (error) {
            logger.error({
                error: error.message,
                shipmentId,
                carrier,
                service,
            }, "Failed to purchase shipment");
            throw error;
        }
    }
    // ============================================================================
    // MOCK DATA FOR ENHANCED CARRIER SUPPORT
    // ============================================================================
    getMockCarriers() {
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
    getMockRatesByCarriers(carrierNames) {
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
        return allRates.filter((rate) => carrierNames.some((carrier) => carrier.toUpperCase() === rate.carrier.toUpperCase()));
    }
    getMockInternationalRates() {
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
    getMockCarrierAccounts() {
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
    getMockAddresses() {
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
    getMockPurchasedShipment(carrier, service) {
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
