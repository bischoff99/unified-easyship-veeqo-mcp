/**
 * FedEx Validation Tool
 * Comprehensive validation against FedEx shipping standards and requirements
 */

import type { FastMCP } from "fastmcp";
import { z } from "zod";
import { safeLogger as logger } from "../../utils/type-safe-logger.js";

// FedEx validation schemas
const FedExAddressSchema = z.object({
  name: z.string().min(1),
  street1: z.string().min(1),
  street2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().length(2),
});

const FedExParcelSchema = z.object({
  length: z.number().min(0.1).max(108), // FedEx max length
  width: z.number().min(0.1).max(108), // FedEx max width
  height: z.number().min(0.1).max(108), // FedEx max height
  weight: z.number().min(0.1).max(150), // FedEx max weight in lbs
});

const FedExValidationInputSchema = z.object({
  origin_address: FedExAddressSchema,
  destination_address: FedExAddressSchema,
  parcel: FedExParcelSchema,
  requested_carrier: z.string().optional(),
  is_international: z.boolean().optional(),
});

// type FedExValidationInput = z.infer<typeof FedExValidationInputSchema>;

interface FedExValidationResult {
  is_valid: boolean;
  validation_score: number; // 0-100
  errors: string[];
  warnings: string[];
  recommendations: string[];
  service_availability: {
    domestic_services: string[];
    international_services: string[];
    restricted_services: string[];
  };
  compliance: {
    weight_compliant: boolean;
    dimension_compliant: boolean;
    address_compliant: boolean;
    carrier_preference_compliant: boolean;
  };
  alternatives: {
    suggested_carriers: string[];
    reason: string;
  };
}

export function addFedExValidationTool(server: FastMCP) {
  /**
   * Validate Order Against FedEx Standards
   * Comprehensive validation of shipping requirements, dimensions, weight, and service availability
   */
  server.addTool({
    name: "validate_fedex_order",
    description:
      "Validate order against FedEx shipping standards including dimensions, weight, address format, and service availability",
    parameters: FedExValidationInputSchema,
    execute: async (args: unknown): Promise<string> => {
      const startTime = Date.now();

      try {
        // Validate input
        const validation = FedExValidationInputSchema.safeParse(args);
        if (!validation.success) {
          throw new Error(`Invalid input: ${validation.error.message}`);
        }

        const {
          origin_address,
          destination_address,
          parcel,
          requested_carrier,
          is_international,
        } = validation.data;

        logger.info("Starting FedEx validation", {
          origin: `${origin_address.city}, ${origin_address.country}`,
          destination: `${destination_address.city}, ${destination_address.country}`,
          parcel: `${parcel.length}x${parcel.width}x${parcel.height} @ ${parcel.weight}lbs`,
          requested_carrier: requested_carrier,
        });

        const errors: string[] = [];
        const warnings: string[] = [];
        const recommendations: string[] = [];

        // 1. Weight Validation (Enhanced with FedEx API standards)
        const weightCompliant = parcel.weight <= 150 && parcel.weight > 0;
        if (!weightCompliant) {
          if (parcel.weight > 150) {
            errors.push(
              `WEIGHT.EXCEEDS.MAXIMUM: Weight ${parcel.weight}lbs exceeds FedEx maximum of 150lbs`,
            );
          }
          if (parcel.weight <= 0) {
            errors.push(
              "WEIGHT.NOT.NULL: Weight must be greater than 0 and cannot be null",
            );
          }
        } else if (parcel.weight > 100) {
          warnings.push(
            `WEIGHT.HIGH: Weight ${parcel.weight}lbs is high - consider splitting into multiple packages for better rates`,
          );
        }

        // Additional weight validation for specific services
        if (parcel.weight > 70) {
          warnings.push(
            "WEIGHT.SERVICE.RESTRICTION: Weight over 70lbs may restrict some FedEx International services",
          );
        }

        // 2. Dimension Validation (Enhanced with FedEx API standards)
        const dimensionCompliant =
          parcel.length <= 108 &&
          parcel.width <= 108 &&
          parcel.height <= 108 &&
          parcel.length > 0 &&
          parcel.width > 0 &&
          parcel.height > 0;

        if (!dimensionCompliant) {
          if (
            parcel.length > 108 ||
            parcel.width > 108 ||
            parcel.height > 108
          ) {
            errors.push(
              `LINEAR.UNITS.EXCEED.MAXIMUM: Dimensions exceed FedEx maximum of 108 inches (current: ${parcel.length}x${parcel.width}x${parcel.height})`,
            );
          }
          if (parcel.length <= 0 || parcel.width <= 0 || parcel.height <= 0) {
            errors.push(
              "LINEAR.UNITS.INVALID: All dimensions must be greater than 0",
            );
          }
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

        // 3. Address Validation (Enhanced with FedEx API standards)
        const addressCompliant =
          origin_address.country.length === 2 &&
          destination_address.country.length === 2 &&
          origin_address.zip.length >= 5 &&
          destination_address.zip.length >= 3;

        if (!addressCompliant) {
          if (origin_address.country.length !== 2) {
            errors.push(
              "ADDRESS.COUNTRY.INVALID: Origin country code must be 2 characters (ISO format)",
            );
          }
          if (destination_address.country.length !== 2) {
            errors.push(
              "ADDRESS.COUNTRY.INVALID: Destination country code must be 2 characters (ISO format)",
            );
          }
          if (origin_address.zip.length < 5) {
            warnings.push(
              "ADDRESS.ZIP.SHORT: Origin ZIP code should be at least 5 characters for optimal delivery",
            );
          }
          if (destination_address.zip.length < 3) {
            warnings.push(
              "ADDRESS.POSTAL.SHORT: Destination postal code should be at least 3 characters",
            );
          }
        }

        // Enhanced postal code validation
        if (
          origin_address.country.toUpperCase() === "US" &&
          !/^\d{5}(-\d{4})?$/.test(origin_address.zip)
        ) {
          warnings.push(
            "ADDRESS.ZIP.FORMAT: US ZIP code format should be 12345 or 12345-6789",
          );
        }

        // 4. Carrier Preference Validation
        const carrierCompliant =
          !requested_carrier ||
          requested_carrier.toUpperCase().includes("FEDEX") ||
          requested_carrier.toUpperCase().includes("FEDEX EXPRESS");

        if (!carrierCompliant && requested_carrier) {
          warnings.push(
            `Requested carrier '${requested_carrier}' is not FedEx - will default to FedEx`,
          );
        }

        // 5. International Service Validation (Enhanced with FedEx API standards)
        const isInternational =
          is_international ??
          destination_address.country.toUpperCase() !== "US";

        // FedEx international restrictions (from official documentation)
        const restrictedCountries = ["CU", "IR", "KP", "SY"]; // Cuba, Iran, North Korea, Syria
        const isRestricted = restrictedCountries.includes(
          destination_address.country.toUpperCase(),
        );

        if (isRestricted) {
          errors.push(
            `SHIPPING.RESTRICTED.COUNTRY: FedEx does not ship to ${destination_address.country} due to trade restrictions`,
          );
        }

        // Service-specific validation for international shipments
        if (isInternational) {
          if (parcel.weight > 70) {
            warnings.push(
              "INTERNATIONAL.WEIGHT.RESTRICTION: Weight over 70lbs may restrict FedEx International First service",
            );
          }

          // Check for potential documentation requirements
          const highValueThreshold = 2500; // USD
          if (parcel.weight * 50 > highValueThreshold) {
            // Rough value estimate
            recommendations.push(
              "INTERNATIONAL.DOCUMENTATION: High-value international shipments may require additional documentation",
            );
          }
        }

        // 6. Service Availability
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
        if (isInternational && parcel.weight > 70) {
          restrictedServices.push("FedEx International First");
        }

        // 7. Calculate Validation Score
        let score = 100;
        score -= errors.length * 20; // Each error reduces score by 20 points
        score -= warnings.length * 5; // Each warning reduces score by 5 points
        score = Math.max(0, score);

        // 8. Generate Recommendations
        if (parcel.weight > 50) {
          recommendations.push(
            "Consider FedEx Ground for heavy packages to reduce costs",
          );
        }
        if (isInternational && parcel.weight < 1) {
          recommendations.push(
            "Light international packages may benefit from FedEx International Economy",
          );
        }
        if (parcel.length + parcel.width + parcel.height > 130) {
          recommendations.push(
            "Large packages may incur dimensional weight charges",
          );
        }

        // 9. Alternative Carriers
        const suggestedCarriers: string[] = [];
        let alternativeReason = "";

        if (errors.length > 0) {
          if (parcel.weight > 150) {
            suggestedCarriers.push("UPS", "Freight Services");
            alternativeReason = "Weight exceeds FedEx limits";
          }
          if (isRestricted) {
            suggestedCarriers.push("USPS", "DHL");
            alternativeReason = "Destination country restricted by FedEx";
          }
        }

        const result: FedExValidationResult = {
          is_valid: errors.length === 0,
          validation_score: score,
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
            weight_compliant: weightCompliant,
            dimension_compliant: dimensionCompliant,
            address_compliant: addressCompliant,
            carrier_preference_compliant: carrierCompliant,
          },
          alternatives: {
            suggested_carriers: suggestedCarriers,
            reason: alternativeReason,
          },
        };

        const duration = Date.now() - startTime;
        logger.info("FedEx validation completed", {
          is_valid: result.is_valid,
          score: result.validation_score,
          errors_count: result.errors.length,
          warnings_count: result.warnings.length,
          duration_ms: duration,
        });

        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error("FedEx validation failed", {
          error: error.message,
          duration_ms: duration,
        });

        return JSON.stringify(
          {
            is_valid: false,
            validation_score: 0,
            errors: [`Validation failed: ${error.message}`],
            warnings: [],
            recommendations: ["Please check input data format and try again"],
            service_availability: {
              domestic_services: [],
              international_services: [],
              restricted_services: [],
            },
            compliance: {
              weight_compliant: false,
              dimension_compliant: false,
              address_compliant: false,
              carrier_preference_compliant: false,
            },
            alternatives: {
              suggested_carriers: ["UPS", "USPS", "DHL"],
              reason: "Validation system error",
            },
          },
          null,
          2,
        );
      }
    },
  });

  logger.info("FedEx validation tool loaded successfully");
}
