/**
 * Order Processing Prompt for EasyPost Integration
 * Handles raw order data processing with California origin and FedEx rates
 */

import type { FastMCP } from "fastmcp";
import { EasyPostClient } from "../../services/clients/easypost-enhanced.js";
import { VeeqoClient } from "../../services/clients/veeqo-enhanced.js";
import { safeLogger as logger } from "../../utils/type-safe-logger.js";

/**
 * Get default address for a given state
 */
function getDefaultAddressForState(state: string) {
  const defaultAddresses: Record<string, any> = {
    CALIFORNIA: {
      name: "California Warehouse",
      street1: "123 Commerce Way",
      street2: "Suite 100",
      city: "Los Angeles",
      state: "CA",
      zip: "90210",
      country: "US",
    },
    TEXAS: {
      name: "Texas Warehouse",
      street1: "456 Industrial Blvd",
      street2: "Building A",
      city: "Houston",
      state: "TX",
      zip: "77001",
      country: "US",
    },
    "NEW YORK": {
      name: "New York Warehouse",
      street1: "789 Business Park",
      street2: "Unit 200",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "US",
    },
    FLORIDA: {
      name: "Florida Warehouse",
      street1: "321 Distribution Center",
      street2: "Suite 150",
      city: "Miami",
      state: "FL",
      zip: "33101",
      country: "US",
    },
  };

  return defaultAddresses[state] || defaultAddresses["CALIFORNIA"];
}

export function addOrderProcessingPrompt(
  server: FastMCP,
  easyPostClient: EasyPostClient,
  veeqoClient: VeeqoClient,
) {
  /**
   * Process Raw Order Data Prompt
   * Processes tab-separated order data and creates complete shipping workflow
   */
  server.addPrompt({
    name: "process_order_data",
    description:
      "Process raw order data: parse customer info, create California origin, set 22x18x5 parcel, populate with jeans products, get FedEx rates, and optionally purchase shipping label",
    arguments: [
      {
        name: "order_data",
        description:
          "Tab-separated order data: State, Carrier, FirstName, LastName, Phone, Email, Address1, Address2, City, State, Zip, Country, Boolean, Weight",
        required: true,
      },
      {
        name: "interactive_mode",
        description:
          "Enable interactive mode for rate selection and purchase (true/false)",
        required: false,
      },
      {
        name: "selected_rate_id",
        description: "Rate ID to purchase (only used in interactive mode)",
        required: false,
      },
      {
        name: "purchase_confirmation",
        description: "Confirmation to proceed with purchase (yes/no)",
        required: false,
      },
    ],
    load: async (args) => {
      const startTime = Date.now();
      try {
        logger.info("Processing order data", { order_data: args.order_data });

        // Parse the tab-separated order data
        const parts = (args.order_data || "").split("\t");
        if (parts.length < 14) {
          throw new Error(
            "Invalid order data format. Expected 14 tab-separated fields.",
          );
        }

        const [
          _state,
          carrier,
          firstName,
          lastName,
          phone,
          email,
          address1,
          address2,
          city,
          stateCode,
          zip,
          country,
          _booleanFlag,
          weight,
        ] = parts;

        // Validate required fields
        if (
          !firstName ||
          !lastName ||
          !email ||
          !address1 ||
          !city ||
          !stateCode ||
          !zip ||
          !country ||
          !weight
        ) {
          throw new Error("Missing required fields in order data");
        }

        // Step 1: Create customer
        let customer;
        try {
          customer = await veeqoClient.createCustomer({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim(),
            phone: phone?.trim() || "",
            company: "",
          });
          logger.info("Created customer", { customer_id: customer.id });
        } catch (error: any) {
          logger.warn("Customer creation failed, using mock", {
            error: error.message,
          });
          customer = { id: 1, email: email.trim() };
        }

        // Step 2: Set up addresses - fetch real addresses from EasyPost
        let senderAddress;
        try {
          // Try to fetch existing addresses from EasyPost
          const addresses = await easyPostClient.getAddresses();
          logger.info("Fetched addresses from EasyPost", {
            count: addresses.length,
          });

          // Look for an address that matches the origin state
          const originState = parts[0]?.trim().toUpperCase() || "CALIFORNIA";
          const matchingAddress = addresses.find(
            (addr) =>
              addr.state?.toUpperCase() === originState ||
              addr.city?.toUpperCase().includes(originState) ||
              (originState === "CALIFORNIA" &&
                addr.state?.toUpperCase() === "CA"),
          );

          if (matchingAddress) {
            senderAddress = {
              name: matchingAddress.name || `${originState} Warehouse`,
              street1: matchingAddress.street1,
              street2: matchingAddress.street2 || "",
              city: matchingAddress.city,
              state: matchingAddress.state,
              zip: matchingAddress.zip,
              country: matchingAddress.country,
            };
            logger.info("Using existing EasyPost address", {
              address_id: matchingAddress.id || "unknown",
              state: matchingAddress.state,
              city: matchingAddress.city,
            });
          } else {
            // Fallback to default address based on origin state
            senderAddress = getDefaultAddressForState(originState);
            logger.info("Using default address for state", {
              state: originState,
            });
          }
        } catch (error: any) {
          logger.warn("Failed to fetch addresses, using default", {
            error: error.message,
          });
          const originState = parts[0]?.trim().toUpperCase() || "CALIFORNIA";
          senderAddress = getDefaultAddressForState(originState);
        }

        // Country code conversion for common country names
        const countryCodeMap: Record<string, string> = {
          SPAIN: "ES",
          "UNITED STATES": "US",
          USA: "US",
          "UNITED KINGDOM": "GB",
          UK: "GB",
          CANADA: "CA",
          FRANCE: "FR",
          GERMANY: "DE",
          ITALY: "IT",
          NETHERLANDS: "NL",
          AUSTRALIA: "AU",
          JAPAN: "JP",
          CHINA: "CN",
          MEXICO: "MX",
          BRAZIL: "BR",
        };

        const normalizedCountry = country.trim().toUpperCase();
        const countryCode = countryCodeMap[normalizedCountry] || country.trim();

        const destinationAddress = {
          name: `${firstName.trim()} ${lastName.trim()}`,
          street1: address1.trim(),
          street2: address2?.trim() || "",
          city: city.trim(),
          state: stateCode.trim(),
          zip: zip.trim(),
          country: countryCode,
        };

        // Step 3: Set parcel dimensions (22x18x5 as specified)
        const parcelWeight = parseFloat(weight.replace(" lbs", "").trim());
        const parcel = {
          length: 22,
          width: 18,
          height: 5,
          weight: parcelWeight,
        };

        // Step 4: Calculate jeans products (1.2 lbs per pair)
        const jeansWeightPerPair = 1.2;
        const maxJeansPairs = Math.floor(parcelWeight / jeansWeightPerPair);
        const actualJeansPairs = Math.min(maxJeansPairs, 5); // Max 5 pairs

        // Step 5: Create jeans products
        const jeansProducts = [];
        for (let i = 0; i < actualJeansPairs; i++) {
          const product = {
            id: i + 1,
            title: `Premium Denim Jeans - Pair ${i + 1}`,
            sku: `JEANS-${i + 1}`,
            weight: jeansWeightPerPair,
            price: 89.99,
            hts_code: "6203.42.40.60", // Denim trousers HTS code
          };
          jeansProducts.push(product);
        }

        // Step 6: FedEx Validation and Rate Retrieval
        logger.info("Starting FedEx validation and rate retrieval", {
          destination: `${city.trim()}, ${country.trim()}`,
          parcel_weight: parcelWeight,
          parcel_dimensions: "22x18x5",
        });

        // 6a: Comprehensive FedEx Validation (Enhanced with Official API Standards)
        const isInternational = country.trim().toUpperCase() !== "US";
        const requestedCarrier = carrier?.trim().toUpperCase();

        logger.info("Starting comprehensive FedEx validation", {
          destination: `${city.trim()}, ${country.trim()}`,
          weight: parcelWeight,
          dimensions: `${parcel.length}x${parcel.width}x${parcel.height}`,
          requested_carrier: requestedCarrier,
        });

        // Enhanced FedEx validation logic with official API standards
        const errors: string[] = [];
        const warnings: string[] = [];
        const recommendations: string[] = [];

        // 1. Weight Validation (FedEx API Standards)
        if (parcelWeight > 150) {
          errors.push(
            `WEIGHT.EXCEEDS.MAXIMUM: Weight ${parcelWeight}lbs exceeds FedEx maximum of 150lbs`,
          );
        } else if (parcelWeight <= 0) {
          errors.push(
            "WEIGHT.NOT.NULL: Weight must be greater than 0 and cannot be null",
          );
        } else if (parcelWeight > 100) {
          warnings.push(
            `WEIGHT.HIGH: Weight ${parcelWeight}lbs is high - consider splitting into multiple packages for better rates`,
          );
        }

        // Additional weight validation for specific services
        if (parcelWeight > 70) {
          warnings.push(
            "WEIGHT.SERVICE.RESTRICTION: Weight over 70lbs may restrict some FedEx International services",
          );
        }

        // 2. Dimension Validation (FedEx API Standards)
        if (parcel.length > 108 || parcel.width > 108 || parcel.height > 108) {
          errors.push(
            `LINEAR.UNITS.EXCEED.MAXIMUM: Dimensions exceed FedEx maximum of 108 inches (current: ${parcel.length}x${parcel.width}x${parcel.height})`,
          );
        }

        // SmartPost minimum dimension validation
        const totalDimensions = parcel.length + parcel.width + parcel.height;
        if (totalDimensions < 6) {
          warnings.push(
            "SMARTPOSTPACKAGE.MINDIM.ENTERED: Package dimensions may be too small for SmartPost services",
          );
        }

        // Dimensional weight consideration
        if (totalDimensions > 130) {
          warnings.push(
            "DIMENSIONAL.WEIGHT: Large package may incur dimensional weight charges",
          );
        }

        // 3. Address Validation (Enhanced with FedEx API Standards)
        if (destinationAddress.country.length !== 2) {
          errors.push(
            "ADDRESS.COUNTRY.INVALID: Destination country code must be 2 characters (ISO format)",
          );
        }

        if (destinationAddress.zip.length < 3) {
          warnings.push(
            "ADDRESS.POSTAL.SHORT: Destination postal code should be at least 3 characters",
          );
        }

        // Enhanced postal code validation for US
        if (
          destinationAddress.country.toUpperCase() === "US" &&
          !/^\d{5}(-\d{4})?$/.test(destinationAddress.zip)
        ) {
          warnings.push(
            "ADDRESS.ZIP.FORMAT: US ZIP code format should be 12345 or 12345-6789",
          );
        }

        // 4. International Service Validation (FedEx API Standards)
        const restrictedCountries = ["CU", "IR", "KP", "SY"]; // Cuba, Iran, North Korea, Syria
        if (
          restrictedCountries.includes(destinationAddress.country.toUpperCase())
        ) {
          errors.push(
            `SHIPPING.RESTRICTED.COUNTRY: FedEx does not ship to ${destinationAddress.country} due to trade restrictions`,
          );
        }

        // Service-specific validation for international shipments
        if (isInternational) {
          if (parcelWeight > 70) {
            warnings.push(
              "INTERNATIONAL.WEIGHT.RESTRICTION: Weight over 70lbs may restrict FedEx International First service",
            );
          }

          // Check for potential documentation requirements
          const highValueThreshold = 2500; // USD
          if (parcelWeight * 50 > highValueThreshold) {
            // Rough value estimate
            recommendations.push(
              "INTERNATIONAL.DOCUMENTATION: High-value international shipments may require additional documentation",
            );
          }
        }

        // 5. Carrier Preference Validation
        if (requestedCarrier && !requestedCarrier.includes("FEDEX")) {
          warnings.push(
            `CARRIER.PREFERENCE: Requested carrier '${requestedCarrier}' is not FedEx - will default to FedEx`,
          );
        }

        // 6. Generate Recommendations
        if (parcelWeight > 50) {
          recommendations.push(
            "Consider FedEx Ground for heavy packages to reduce costs",
          );
        }
        if (isInternational && parcelWeight < 1) {
          recommendations.push(
            "Light international packages may benefit from FedEx International Economy",
          );
        }
        if (totalDimensions > 130) {
          recommendations.push(
            "Large packages may incur dimensional weight charges",
          );
        }

        // 7. Calculate Validation Score
        let validationScore = 100;
        validationScore -= errors.length * 20; // Each error reduces score by 20 points
        validationScore -= warnings.length * 5; // Each warning reduces score by 5 points
        validationScore = Math.max(0, validationScore);

        // 8. Service Availability
        const domesticServices = [
          "FedEx Ground",
          "FedEx Express Saver",
          "FedEx 2Day",
          "FedEx Standard Overnight",
          "FedEx Priority Overnight",
          "FedEx First Overnight",
        ];

        const internationalServices = [
          "FedEx International Priority",
          "FedEx International Economy",
          "FedEx International First",
        ];

        const restrictedServices: string[] = [];
        if (isInternational && parcelWeight > 70) {
          restrictedServices.push("FedEx International First");
        }

        // 9. Alternative Carriers
        const suggestedCarriers: string[] = [];
        let alternativeReason = "";

        if (errors.length > 0) {
          if (parcelWeight > 150) {
            suggestedCarriers.push("UPS", "Freight Services");
            alternativeReason = "Weight exceeds FedEx limits";
          }
          if (
            restrictedCountries.includes(
              destinationAddress.country.toUpperCase(),
            )
          ) {
            suggestedCarriers.push("USPS", "DHL");
            alternativeReason = "Destination country restricted by FedEx";
          }
          if (
            parcel.length > 108 ||
            parcel.width > 108 ||
            parcel.height > 108
          ) {
            suggestedCarriers.push("UPS", "Freight Services");
            alternativeReason = "Dimensions exceed FedEx limits";
          }
        }

        const fedexValidationResult = {
          is_valid: errors.length === 0,
          validation_score: validationScore,
          errors,
          warnings,
          recommendations,
          service_availability: {
            domestic_services: isInternational ? [] : domesticServices,
            international_services: isInternational
              ? internationalServices
              : [],
            restricted_services: restrictedServices,
          },
          compliance: {
            weight_compliant: parcelWeight <= 150 && parcelWeight > 0,
            dimension_compliant:
              parcel.length <= 108 &&
              parcel.width <= 108 &&
              parcel.height <= 108,
            address_compliant: destinationAddress.country.length === 2,
            carrier_preference_compliant:
              !requestedCarrier || requestedCarrier.includes("FEDEX"),
          },
          alternatives: {
            suggested_carriers: suggestedCarriers,
            reason: alternativeReason,
          },
        };

        logger.info("FedEx validation completed", {
          is_valid: fedexValidationResult.is_valid,
          validation_score: fedexValidationResult.validation_score,
          errors_count: fedexValidationResult.errors.length,
          warnings_count: fedexValidationResult.warnings.length,
        });

        // 6b: Get FedEx rates with comprehensive error handling
        let fedexRates: any[] = [];
        let fedexError: any = null;

        if (fedexValidationResult.is_valid) {
          try {
            fedexRates = await easyPostClient.getRatesByCarriers(
              senderAddress,
              destinationAddress,
              parcel,
              ["FedEx"],
            );

            logger.info("FedEx rates retrieved successfully", {
              rates_count: fedexRates.length,
              services: fedexRates.map((r) => r.service),
            });
          } catch (error: any) {
            fedexError = {
              message: error.message,
              type: "FedEx API Error",
              fallback_available: true,
            };
            logger.error("FedEx rate retrieval failed", fedexError);
          }
        } else {
          fedexError = {
            message: "Order failed FedEx validation",
            type: "Validation Error",
            fallback_available: true,
            validation_errors: fedexValidationResult.errors,
          };
          logger.warn(
            "Skipping FedEx rate retrieval due to validation failures",
            {
              errors: fedexValidationResult.errors,
            },
          );
        }

        // 6c: Get alternative carriers if FedEx fails or is unavailable
        let alternativeRates: any[] = [];
        if (fedexRates.length === 0 || !fedexValidationResult.is_valid) {
          logger.warn(
            "No FedEx rates available, fetching alternative carriers",
          );

          try {
            alternativeRates = await easyPostClient.getRatesByCarriers(
              senderAddress,
              destinationAddress,
              parcel,
              ["UPS", "USPS", "DHL"],
            );

            logger.info("Alternative rates retrieved", {
              alternatives_count: alternativeRates.length,
            });
          } catch (altError: any) {
            logger.error("Failed to get alternative rates", {
              error: altError.message,
            });
          }
        }

        // Step 7: Create customs items for international shipping
        const customsItems = jeansProducts.map((product) => ({
          description: product.title,
          quantity: 1,
          weight: product.weight,
          value: product.price,
          origin_country: "US",
          hs_tariff_number: product.hts_code,
        }));

        // Step 8: Prepare response
        const response = {
          success: true,
          order_summary: {
            customer: {
              id: customer.id,
              name: `${firstName.trim()} ${lastName.trim()}`,
              email: email.trim(),
              phone: phone?.trim() || "",
            },
            origin: {
              address: senderAddress,
              description: "California Warehouse",
            },
            destination: {
              address: destinationAddress,
              country: country.trim(),
              is_international: country.trim().toUpperCase() !== "US",
            },
            parcel: {
              dimensions: '22" x 18" x 5"',
              weight: `${parcelWeight} lbs`,
              description: "Default dimensions with specified weight",
            },
            products: {
              count: actualJeansPairs,
              type: "Premium Denim Jeans",
              total_weight: actualJeansPairs * jeansWeightPerPair,
              remaining_weight:
                parcelWeight - actualJeansPairs * jeansWeightPerPair,
              products: jeansProducts,
            },
            customs: {
              items: customsItems,
              total_value: customsItems.reduce(
                (sum, item) => sum + item.value,
                0,
              ),
              hts_codes: ["6203.42.40.60"],
            },
          },
          shipping: {
            carrier: "FedEx",
            fedex_validation: fedexValidationResult,
            rates: fedexRates.map((rate) => ({
              service: rate.service,
              cost: parseFloat(rate.rate),
              currency: rate.currency,
              delivery_days: rate.delivery_days,
              retail_rate: parseFloat(rate.retail_rate || rate.rate),
            })),
            recommended_rate:
              fedexRates.length > 0
                ? fedexRates.reduce((best, current) =>
                    parseFloat(current.rate) < parseFloat(best.rate)
                      ? current
                      : best,
                  )
                : null,
            fallback_alternatives: fedexValidationResult.alternatives,
          },
          processing_time_ms: Date.now() - startTime,
          summary: `Processed order for ${firstName.trim()} ${lastName.trim()} (${email.trim()}) shipping ${actualJeansPairs} pairs of jeans (${parcelWeight} lbs total) from California to ${city.trim()}, ${stateCode.trim()}, ${country.trim()}. FedEx validation: ${fedexValidationResult.is_valid ? "SUCCESS" : "FAILED"} - Found ${fedexRates.length} FedEx rates${alternativeRates.length > 0 ? ` and ${alternativeRates.length} alternative carrier options` : ""}.`,
        };

        logger.info("Order processing completed", {
          customer_email: email.trim(),
          destination: `${city.trim()}, ${country.trim()}`,
          parcel_weight: parcelWeight,
          jeans_pairs: actualJeansPairs,
          fedex_rates: fedexRates.length,
          duration_ms: response.processing_time_ms,
        });

        // Create enhanced display format for rates
        let displayOutput = "";

        // Header
        displayOutput += "🚀 ENHANCED ORDER PROCESSING WITH FEDEX RATES\n";
        displayOutput += "=".repeat(80) + "\n\n";

        // Order Summary
        displayOutput += "📋 ORDER SUMMARY:\n";
        displayOutput += `   Customer: ${firstName.trim()} ${lastName.trim()} (${email.trim()})\n`;
        displayOutput += `   Origin: California Warehouse → ${city.trim()}, ${stateCode.trim()}, ${country.trim()}\n`;
        displayOutput += `   Parcel: 22" x 18" x 5" (${parcelWeight} lbs)\n`;
        displayOutput += `   Products: ${actualJeansPairs} pairs of Premium Denim Jeans\n`;
        displayOutput += `   International: ${country.trim().toUpperCase() !== "US" ? "Yes" : "No"}\n\n`;

        // FedEx Validation Results
        displayOutput += "🔍 FEDEX VALIDATION RESULTS:\n";
        displayOutput += `   Status: ${fedexValidationResult.is_valid ? "✅ PASSED" : "❌ FAILED"}\n`;
        displayOutput += `   Score: ${fedexValidationResult.validation_score}/100\n`;
        displayOutput += `   Weight Compliant: ${fedexValidationResult.compliance.weight_compliant ? "✅" : "❌"}\n`;
        displayOutput += `   Dimension Compliant: ${fedexValidationResult.compliance.dimension_compliant ? "✅" : "❌"}\n`;
        displayOutput += `   Address Compliant: ${fedexValidationResult.compliance.address_compliant ? "✅" : "❌"}\n`;

        if (fedexValidationResult.errors.length > 0) {
          displayOutput += "\n   🚨 ERRORS:\n";
          fedexValidationResult.errors.forEach((error) => {
            displayOutput += `      ❌ ${error}\n`;
          });
        }

        if (fedexValidationResult.warnings.length > 0) {
          displayOutput += "\n   ⚠️  WARNINGS:\n";
          fedexValidationResult.warnings.forEach((warning) => {
            displayOutput += `      ⚠️  ${warning}\n`;
          });
        }

        if (fedexValidationResult.recommendations.length > 0) {
          displayOutput += "\n   💡 RECOMMENDATIONS:\n";
          fedexValidationResult.recommendations.forEach((rec) => {
            displayOutput += `      💡 ${rec}\n`;
          });
        }

        displayOutput += "\n";

        // FedEx Rates Display
        if (fedexRates.length > 0) {
          displayOutput += "🚚 FEDEX SHIPPING RATES:\n";
          displayOutput += "=".repeat(50) + "\n";

          fedexRates.forEach((rate, index) => {
            const cost = parseFloat(rate.rate);
            const retailRate = parseFloat(rate.retail_rate || rate.rate);
            const savings = retailRate - cost;

            displayOutput += `${index + 1}. ${rate.service}\n`;
            displayOutput += `   💰 Cost: $${cost.toFixed(2)} ${rate.currency}\n`;
            displayOutput += `   🏷️  Retail: $${retailRate.toFixed(2)} ${rate.currency}\n`;
            displayOutput += `   💵 Savings: $${savings.toFixed(2)} ${rate.currency}\n`;
            displayOutput += `   📅 Delivery: ${rate.delivery_days} day(s)\n`;
            displayOutput += `   🚀 Speed: ${rate.service.includes("First") ? "Fastest" : rate.service.includes("Priority") ? "Fast" : "Economy"}\n\n`;
          });

          // Recommended Rate
          if (response.shipping.recommended_rate) {
            const recommended = response.shipping.recommended_rate;
            displayOutput += "🎯 RECOMMENDED OPTION:\n";
            displayOutput += `   Service: ${recommended.service}\n`;
            displayOutput += `   Cost: $${parseFloat(recommended.rate).toFixed(2)} ${recommended.currency}\n`;
            displayOutput += `   Delivery: ${recommended.delivery_days} day(s)\n`;
            displayOutput += `   Why: Best value for money\n\n`;
          }
        } else if (fedexError) {
          displayOutput += "❌ FEDEX RATES UNAVAILABLE:\n";
          displayOutput += `   Error: ${fedexError.message}\n`;
          displayOutput += `   Type: ${fedexError.type}\n`;
          if (fedexError.fallback_available) {
            displayOutput += `   Fallback: Alternative carriers available\n\n`;
          }
        }

        // Alternative Carriers
        if (alternativeRates.length > 0) {
          displayOutput += "🔄 ALTERNATIVE CARRIER RATES:\n";
          displayOutput += "=".repeat(50) + "\n";

          alternativeRates.forEach((rate, index) => {
            const cost = parseFloat(rate.rate);
            displayOutput += `${index + 1}. ${rate.service}\n`;
            displayOutput += `   💰 Cost: $${cost.toFixed(2)} ${rate.currency}\n`;
            displayOutput += `   📅 Delivery: ${rate.delivery_days} day(s)\n\n`;
          });
        }

        // Service Availability
        displayOutput += "🚚 AVAILABLE SERVICES:\n";
        if (
          fedexValidationResult.service_availability.domestic_services.length >
          0
        ) {
          displayOutput += "   🏠 Domestic Services:\n";
          fedexValidationResult.service_availability.domestic_services.forEach(
            (service) => {
              displayOutput += `      - ${service}\n`;
            },
          );
        }
        if (
          fedexValidationResult.service_availability.international_services
            .length > 0
        ) {
          displayOutput += "   🌍 International Services:\n";
          fedexValidationResult.service_availability.international_services.forEach(
            (service) => {
              displayOutput += `      - ${service}\n`;
            },
          );
        }
        if (
          fedexValidationResult.service_availability.restricted_services
            .length > 0
        ) {
          displayOutput += "   🚫 Restricted Services:\n";
          fedexValidationResult.service_availability.restricted_services.forEach(
            (service) => {
              displayOutput += `      - ${service}\n`;
            },
          );
        }

        // Processing Summary
        displayOutput += "\n" + "=".repeat(80) + "\n";
        displayOutput += "📊 PROCESSING SUMMARY:\n";
        displayOutput += `   Processing Time: ${response.processing_time_ms}ms\n`;
        displayOutput += `   FedEx Rates Found: ${fedexRates.length}\n`;
        displayOutput += `   Alternative Rates: ${alternativeRates.length}\n`;
        displayOutput += `   Validation Score: ${fedexValidationResult.validation_score}/100\n`;
        displayOutput += `   Status: ${response.success ? "✅ SUCCESS" : "❌ FAILED"}\n`;

        if (response.shipping.recommended_rate) {
          displayOutput += `   Best Rate: $${parseFloat(response.shipping.recommended_rate.rate).toFixed(2)} ${response.shipping.recommended_rate.currency}\n`;
        }

        displayOutput += "\n" + "=".repeat(80) + "\n";
        displayOutput += "🎉 ORDER PROCESSING COMPLETE!\n";
        displayOutput += "=".repeat(80) + "\n\n";

        // Interactive Mode Logic
        const interactiveMode =
          args.interactive_mode === "true" || args.interactive_mode === "true";
        const selectedRateId = args.selected_rate_id;
        const purchaseConfirmation = args.purchase_confirmation;

        if (interactiveMode && fedexRates.length > 0) {
          // Step 1: Display rates and ask for selection
          if (!selectedRateId) {
            displayOutput += "🛒 INTERACTIVE PURCHASE MODE\n";
            displayOutput += "=".repeat(50) + "\n";
            displayOutput += "Please select a shipping rate to purchase:\n\n";

            fedexRates.forEach((rate, index) => {
              const cost = parseFloat(rate.rate);
              const retailRate = parseFloat(rate.retail_rate || rate.rate);
              const savings = retailRate - cost;

              displayOutput += `${index + 1}. ${rate.service}\n`;
              displayOutput += `   💰 Cost: $${cost.toFixed(2)} ${rate.currency}\n`;
              displayOutput += `   🏷️  Retail: $${retailRate.toFixed(2)} ${rate.currency}\n`;
              displayOutput += `   💵 Savings: $${savings.toFixed(2)} ${rate.currency}\n`;
              displayOutput += `   📅 Delivery: ${rate.delivery_days} day(s)\n`;
              displayOutput += `   🆔 Rate ID: ${rate.id || `rate_${index + 1}`}\n\n`;
            });

            displayOutput += "📝 TO SELECT A RATE:\n";
            displayOutput += "   Call this prompt again with:\n";
            displayOutput +=
              '   - selected_rate_id: "rate_1" (or rate_2, rate_3, etc.)\n';
            displayOutput +=
              "   - Same order_data and interactive_mode: true\n\n";

            displayOutput += "💡 RECOMMENDATION:\n";
            if (response.shipping.recommended_rate) {
              const recommended = response.shipping.recommended_rate;
              displayOutput += `   Best Value: ${recommended.service} - $${parseFloat(recommended.rate).toFixed(2)} ${recommended.currency}\n`;
            }

            return (
              displayOutput +
              "\n\n" +
              "📋 STRUCTURED DATA:\n" +
              JSON.stringify(response, null, 2)
            );
          }

          // Step 2: Rate selected, ask for confirmation
          if (selectedRateId && !purchaseConfirmation) {
            const selectedRate = fedexRates.find(
              (rate, index) =>
                (rate.id || `rate_${index + 1}`) === selectedRateId,
            );

            if (!selectedRate) {
              displayOutput += "❌ ERROR: Invalid rate ID selected\n";
              displayOutput += `   Selected: ${selectedRateId}\n`;
              displayOutput +=
                "   Available rates: " +
                fedexRates
                  .map((rate, index) => rate.id || `rate_${index + 1}`)
                  .join(", ") +
                "\n";
              return displayOutput;
            }

            const cost = parseFloat(selectedRate.rate);
            const retailRate = parseFloat(
              selectedRate.retail_rate || selectedRate.rate,
            );
            const savings = retailRate - cost;

            displayOutput += "🛒 RATE SELECTION CONFIRMATION\n";
            displayOutput += "=".repeat(50) + "\n";
            displayOutput += `Selected Rate: ${selectedRate.service}\n`;
            displayOutput += `💰 Cost: $${cost.toFixed(2)} ${selectedRate.currency}\n`;
            displayOutput += `🏷️  Retail: $${retailRate.toFixed(2)} ${selectedRate.currency}\n`;
            displayOutput += `💵 Savings: $${savings.toFixed(2)} ${selectedRate.currency}\n`;
            displayOutput += `📅 Delivery: ${selectedRate.delivery_days} day(s)\n`;
            displayOutput += `🆔 Rate ID: ${selectedRateId}\n\n`;

            displayOutput += "📦 SHIPMENT DETAILS:\n";
            displayOutput += `   From: California Warehouse\n`;
            displayOutput += `   To: ${firstName.trim()} ${lastName.trim()}\n`;
            displayOutput += `   Address: ${address1.trim()}, ${city.trim()}, ${stateCode.trim()} ${zip.trim()}, ${country.trim()}\n`;
            displayOutput += `   Package: 22" x 18" x 5" (${parcelWeight} lbs)\n`;
            displayOutput += `   Contents: ${actualJeansPairs} pairs of Premium Denim Jeans\n\n`;

            displayOutput += "📝 TO PURCHASE THIS LABEL:\n";
            displayOutput += "   Call this prompt again with:\n";
            displayOutput += "   - Same order_data\n";
            displayOutput += "   - Same selected_rate_id\n";
            displayOutput += '   - purchase_confirmation: "yes"\n\n';

            displayOutput +=
              "⚠️  WARNING: This will create a real shipping label and charge your account!\n";

            return (
              displayOutput +
              "\n\n" +
              "📋 STRUCTURED DATA:\n" +
              JSON.stringify(response, null, 2)
            );
          }

          // Step 3: Purchase confirmation received, create label
          if (selectedRateId && purchaseConfirmation === "yes") {
            const selectedRate = fedexRates.find(
              (rate, index) =>
                (rate.id || `rate_${index + 1}`) === selectedRateId,
            );

            if (!selectedRate) {
              displayOutput += "❌ ERROR: Invalid rate ID for purchase\n";
              return displayOutput;
            }

            displayOutput += "🛒 PURCHASING SHIPPING LABEL...\n";
            displayOutput += "=".repeat(50) + "\n";

            try {
              // Create shipment first
              const customsInfo =
                country.trim().toUpperCase() !== "US"
                  ? {
                      contents_type: "merchandise",
                      contents_explanation: "Premium Denim Jeans",
                      customs_items: customsItems,
                    }
                  : undefined;

              const shipment = await easyPostClient.createShipment(
                destinationAddress,
                senderAddress,
                parcel,
                customsInfo,
              );

              // Purchase the shipment with the selected rate
              const purchasedShipment =
                await easyPostClient.purchaseShipmentWithCarrier(
                  shipment.id,
                  "FedEx",
                  selectedRate.service,
                );

              displayOutput += "✅ LABEL PURCHASED SUCCESSFULLY!\n\n";
              displayOutput += "📋 LABEL DETAILS:\n";
              displayOutput += `   Tracking Number: ${purchasedShipment.tracking_code}\n`;
              displayOutput += `   Service: ${selectedRate.service}\n`;
              displayOutput += `   Cost: $${parseFloat(selectedRate.rate).toFixed(2)} ${selectedRate.currency}\n`;
              displayOutput += `   Label URL: ${purchasedShipment.postage_label?.label_url || "Available in EasyPost dashboard"}\n`;
              displayOutput += `   Shipment ID: ${purchasedShipment.id}\n\n`;

              displayOutput += "📦 SHIPMENT READY:\n";
              displayOutput += `   From: California Warehouse\n`;
              displayOutput += `   To: ${firstName.trim()} ${lastName.trim()}\n`;
              displayOutput += `   Address: ${address1.trim()}, ${city.trim()}, ${stateCode.trim()} ${zip.trim()}, ${country.trim()}\n`;
              displayOutput += `   Package: 22" x 18" x 5" (${parcelWeight} lbs)\n`;
              displayOutput += `   Contents: ${actualJeansPairs} pairs of Premium Denim Jeans\n\n`;

              displayOutput += "📝 NEXT STEPS:\n";
              displayOutput += "   1. Print the label from the URL above\n";
              displayOutput += "   2. Attach to your package\n";
              displayOutput +=
                "   3. Drop off at FedEx location or schedule pickup\n";
              displayOutput += "   4. Track using the tracking number\n\n";

              // Update response with purchase details
              (response.shipping as any).purchased_label = {
                tracking_code: purchasedShipment.tracking_code,
                service: selectedRate.service,
                cost: parseFloat(selectedRate.rate),
                currency: selectedRate.currency,
                label_url:
                  purchasedShipment.postage_label?.label_url ||
                  "Available in EasyPost dashboard",
                shipment_id: purchasedShipment.id,
                purchase_time: new Date().toISOString(),
              };
            } catch (purchaseError: any) {
              displayOutput += "❌ LABEL PURCHASE FAILED:\n";
              displayOutput += `   Error: ${purchaseError.message}\n`;
              displayOutput += "   Please try again or contact support\n\n";

              logger.error("Label purchase failed", {
                error: purchaseError.message,
                rate_id: selectedRateId,
                customer_email: email.trim(),
              });
            }
          }
        }

        // Return both structured data and enhanced display
        return (
          displayOutput +
          "\n\n" +
          "📋 STRUCTURED DATA:\n" +
          JSON.stringify(response, null, 2)
        );
      } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error("Order processing failed", {
          error: error.message,
          duration_ms: duration,
        });
        throw new Error(`Order processing failed: ${error.message}`);
      }
    },
  });

  logger.info("Order processing prompt loaded successfully");
}
