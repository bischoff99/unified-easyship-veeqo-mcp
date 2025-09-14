/**
 * Advanced shipping rate optimization tool
 * Compares rates across multiple carriers and provides recommendations
 */

import { EasyPostClient } from '../../services/clients/easypost-enhanced.js';
import { AddressSchema } from '../../api/schemas/address.js';
import { z } from 'zod';

const OptimizeShippingSchema = z.object({
  fromAddress: AddressSchema,
  toAddress: AddressSchema,
  parcel: z.object({
    length: z.number(),
    width: z.number(),
    height: z.number(),
    weight: z.number(),
  }),
  preferences: z.object({
    maxCost: z.number().optional(),
    maxDeliveryDays: z.number().optional(),
    preferredCarriers: z.array(z.string()).optional(),
    prioritizeSpeed: z.boolean().default(false),
    prioritizeCost: z.boolean().default(true),
  }).optional(),
});

export async function optimizeShipping(params: unknown) {
  const input = OptimizeShippingSchema.parse(params);
  const client = new EasyPostClient();

  try {
    // Ensure required address fields
    const fromAddr = {
      ...input.fromAddress,
      name: input.fromAddress.name || 'Sender',
      state: input.fromAddress.state || ''
    };
    const toAddr = {
      ...input.toAddress,
      name: input.toAddress.name || 'Recipient',
      state: input.toAddress.state || ''
    };

    // Get rates from all available carriers
    const allRates = await client.getRates(toAddr, fromAddr, input.parcel);

    // Get carrier-specific rates for better comparison
    const carrierRates = await Promise.allSettled([
      client.getRatesByCarriers(toAddr, fromAddr, input.parcel, ['USPS']),
      client.getRatesByCarriers(toAddr, fromAddr, input.parcel, ['UPS']),
      client.getRatesByCarriers(toAddr, fromAddr, input.parcel, ['FedEx']),
    ]);

    // Combine all successful rate responses
    const combinedRates = [
      ...allRates,
      ...carrierRates
        .filter((result) => result.status === 'fulfilled')
        .flatMap((result) => (result as any).value)
    ];

    // Remove duplicates based on rate ID
    const uniqueRates = combinedRates.filter((rate, index, self) =>
      index === self.findIndex((r) => r.id === rate.id)
    );

    // Apply filters based on preferences
    let filteredRates = uniqueRates;

    if (input.preferences) {
      const prefs = input.preferences;

      // Filter by max cost
      if (prefs.maxCost) {
        filteredRates = filteredRates.filter(
          (rate) => parseFloat(rate.rate) <= prefs.maxCost!
        );
      }

      // Filter by max delivery days
      if (prefs.maxDeliveryDays) {
        filteredRates = filteredRates.filter(
          (rate) => rate.delivery_days <= prefs.maxDeliveryDays!
        );
      }

      // Filter by preferred carriers
      if (prefs.preferredCarriers && prefs.preferredCarriers.length > 0) {
        filteredRates = filteredRates.filter((rate) =>
          prefs.preferredCarriers!.includes(rate.carrier)
        );
      }
    }

    // Sort based on preferences
    const preferences = input.preferences || { prioritizeSpeed: false, prioritizeCost: true };
    if (preferences.prioritizeSpeed) {
      filteredRates.sort((a, b) => a.delivery_days - b.delivery_days);
    } else if (preferences.prioritizeCost) {
      filteredRates.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));
    }

    // Create recommendations
    const recommendations = {
      fastest: filteredRates.sort((a, b) => a.delivery_days - b.delivery_days)[0],
      cheapest: filteredRates.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))[0],
      bestValue: filteredRates.sort((a, b) => {
        // Score based on cost per delivery day
        const aScore = parseFloat(a.rate) / Math.max(a.delivery_days, 1);
        const bScore = parseFloat(b.rate) / Math.max(b.delivery_days, 1);
        return aScore - bScore;
      })[0],
    };

    // Calculate savings compared to retail rates
    const savings = filteredRates.map(rate => ({
      ...rate,
      savings: rate.retail_rate
        ? (parseFloat(rate.retail_rate) - parseFloat(rate.rate)).toFixed(2)
        : '0.00',
      savingsPercent: rate.retail_rate
        ? (((parseFloat(rate.retail_rate) - parseFloat(rate.rate)) / parseFloat(rate.retail_rate)) * 100).toFixed(1)
        : '0.0'
    }));

    // Carrier analysis
    const carrierAnalysis = Object.values(
      savings.reduce((acc: any, rate) => {
        if (!acc[rate.carrier]) {
          acc[rate.carrier] = {
            carrier: rate.carrier,
            rateCount: 0,
            avgCost: 0,
            avgDeliveryDays: 0,
            totalSavings: 0,
            services: []
          };
        }
        acc[rate.carrier].rateCount++;
        acc[rate.carrier].avgCost =
          (acc[rate.carrier].avgCost * (acc[rate.carrier].rateCount - 1) + parseFloat(rate.rate)) /
          acc[rate.carrier].rateCount;
        acc[rate.carrier].avgDeliveryDays =
          (acc[rate.carrier].avgDeliveryDays * (acc[rate.carrier].rateCount - 1) + rate.delivery_days) /
          acc[rate.carrier].rateCount;
        acc[rate.carrier].totalSavings += parseFloat(rate.savings);
        acc[rate.carrier].services.push(rate.service);
        return acc;
      }, {})
    );

    return {
      success: true,
      totalRatesFound: uniqueRates.length,
      filteredRatesCount: filteredRates.length,
      recommendations,
      rates: savings.slice(0, 10), // Return top 10 rates
      carrierAnalysis,
      optimizationTips: [
        recommendations.cheapest && `Save $${recommendations.cheapest.savings} with ${recommendations.cheapest.carrier} ${recommendations.cheapest.service}`,
        recommendations.fastest && `Get fastest delivery (${recommendations.fastest.delivery_days} days) with ${recommendations.fastest.carrier}`,
        savings.length > 0 && `Total potential savings: $${savings.reduce((sum, rate) => sum + parseFloat(rate.savings), 0).toFixed(2)}`,
      ].filter(Boolean),
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      rates: [],
      recommendations: {},
    };
  }
}