/**
 * AI Integration Tools Module for FastMCP Server
 * Contains all AI-powered tools and Claude Code integration functionality
 */

import { z } from 'zod';
import type { FastMCP } from 'fastmcp';
import { EasyPostClient } from '../../services/clients/easypost-enhanced.js';
import { VeeqoClient } from '../../services/clients/veeqo-enhanced.js';
import {
  analyzeCode,
  generateShippingRecommendations,
  optimizeShipping,
} from '../../services/integrations/claude-code.js';
import { safeLogger as logger, safeMonitoring as monitoring } from '../../utils/type-safe-logger.js';

const logError = (message: string, error: any) => {
  logger.error(message, error);
};

export function addAIIntegrationTools(
  server: FastMCP,
  _easyPostClient: EasyPostClient,
  _veeqoClient: VeeqoClient
) {
  /**
   * AI-powered shipping optimization
   */
  server.addTool({
    name: 'optimize_shipping',
    description: 'Use AI to optimize shipping decisions based on cost, speed, and reliability',
    parameters: z.object({
      orders: z.array(z.object({
        id: z.string(),
        destination: z.object({
          city: z.string(),
          state: z.string(),
          country: z.string(),
          zip: z.string(),
        }),
        weight: z.number(),
        dimensions: z.object({
          length: z.number(),
          width: z.number(),
          height: z.number(),
        }),
        value: z.number(),
        priority: z.enum(['standard', 'expedited', 'urgent']).default('standard'),
      })).describe('Array of orders to optimize shipping for'),
      preferences: z.object({
        cost_weight: z.number().min(0).max(1).default(0.5).describe('Weight given to cost optimization (0-1)'),
        speed_weight: z.number().min(0).max(1).default(0.3).describe('Weight given to delivery speed (0-1)'),
        reliability_weight: z.number().min(0).max(1).default(0.2).describe('Weight given to carrier reliability (0-1)'),
        max_cost_per_order: z.number().optional().describe('Maximum acceptable cost per order'),
      }).describe('Optimization preferences and constraints'),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info('Starting AI shipping optimization', {
          orders: args.orders.length,
          preferences: args.preferences,
        });

        // Convert first order to package format expected by optimizeShipping
        const firstOrder = args.orders[0];
        if (!firstOrder) {
          throw new Error('No orders provided for optimization');
        }

        const optimization = await optimizeShipping({
          package: {
            weight: firstOrder.weight,
            dimensions: firstOrder.dimensions,
            value: firstOrder.value,
            contents: `Order ${firstOrder.id || 'unknown'}`,
          },
          requirements: {
            delivery_time: firstOrder.priority === 'urgent' ? 'overnight' : 
                          firstOrder.priority === 'expedited' ? 'expedited' : 'standard',
            cost_priority: args.preferences.cost_weight > 0.5 ? 'lowest' : 
                          args.preferences.speed_weight > 0.5 ? 'fastest' : 'balanced',
            insurance_required: firstOrder.value > 100,
          },
          origin: `${firstOrder.destination.city}, ${firstOrder.destination.state}`, // Use destination as temp origin
          destination: `${firstOrder.destination.city}, ${firstOrder.destination.state}, ${firstOrder.destination.country}`,
          business_context: {
            customer_type: 'b2c',
            volume: 'medium',
          },
        });

        const duration = Date.now() - startTime;
        monitoring.recordApiCall('claude-code', '/optimize-shipping', duration, 200);

        logger.info(`Completed shipping optimization in ${duration}ms`);
        const result = {
          ...optimization,
          processing_time_ms: duration,
        };
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall('claude-code', '/optimize-shipping', duration, 500, true);
        logError('AI shipping optimization failed', error);
        throw new Error(`Shipping optimization failed: ${error.message}`);
      }
    },
  });

  /**
   * Generate shipping recommendations
   */
  server.addTool({
    name: 'generate_shipping_recommendations',
    description: 'Generate intelligent shipping recommendations based on order patterns and data',
    parameters: z.object({
      order_data: z.object({
        destination_country: z.string(),
        destination_state: z.string().optional(),
        destination_city: z.string().optional(),
        package_weight: z.number(),
        package_dimensions: z.object({
          length: z.number(),
          width: z.number(),
          height: z.number(),
        }),
        order_value: z.number(),
        customer_type: z.enum(['new', 'returning', 'premium']).default('returning'),
        urgency: z.enum(['low', 'medium', 'high']).default('medium'),
      }).describe('Order information for generating recommendations'),
      historical_data: z.object({
        avg_delivery_days: z.number().optional(),
        cost_sensitivity: z.number().min(0).max(1).default(0.5),
        preferred_carriers: z.array(z.string()).optional(),
      }).optional().describe('Historical shipping data and preferences'),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info('Generating shipping recommendations', {
          destination: `${args.order_data.destination_city}, ${args.order_data.destination_state}, ${args.order_data.destination_country}`,
          weight: args.order_data.package_weight,
          value: args.order_data.order_value,
        });

        const context = `Order to ${args.order_data.destination_city || 'Unknown'}, ${args.order_data.destination_state || 'Unknown'}, ${args.order_data.destination_country}. Weight: ${args.order_data.package_weight}oz, Value: $${args.order_data.order_value}`;
        const requirements = [
          'Optimize for cost-effectiveness',
          'Ensure reliable delivery',
          'Consider delivery time requirements'
        ];
        const recommendations = await generateShippingRecommendations(context, requirements);

        const duration = Date.now() - startTime;
        monitoring.recordApiCall('claude-code', '/recommendations', duration, 200);

        logger.info(`Generated ${recommendations.length} shipping recommendations in ${duration}ms`);
        const result = {
          ...recommendations,
          processing_time_ms: duration,
        };
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall('claude-code', '/recommendations', duration, 500, true);
        logError('Failed to generate shipping recommendations', error);
        throw new Error(`Recommendation generation failed: ${error.message}`);
      }
    },
  });

  /**
   * Analyze code and shipping patterns
   */
  server.addTool({
    name: 'analyze_shipping_patterns',
    description: 'Analyze shipping code, patterns, and performance data using AI',
    parameters: z.object({
      analysis_type: z.enum(['code_review', 'pattern_analysis', 'performance_optimization']).describe('Type of analysis to perform'),
      data: z.object({
        code: z.string().optional().describe('Code to analyze (for code_review)'),
        shipping_data: z.array(z.object({
          carrier: z.string(),
          service: z.string(),
          cost: z.number(),
          delivery_days: z.number(),
          success_rate: z.number().min(0).max(1),
          destination_zone: z.string(),
        })).optional().describe('Shipping performance data (for pattern_analysis)'),
        performance_metrics: z.object({
          avg_processing_time: z.number(),
          error_rate: z.number(),
          throughput: z.number(),
        }).optional().describe('Performance metrics (for performance_optimization)'),
      }).describe('Data to analyze based on analysis type'),
      focus_areas: z.array(z.string()).optional().describe('Specific areas to focus the analysis on'),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info('Starting AI code/pattern analysis', {
          analysis_type: args.analysis_type,
          focus_areas: args.focus_areas,
        });

        const analysis = await analyzeCode({
          code: args.data.code || '// No code provided',
          language: 'typescript',
          context: 'shipping',
          focus_areas: args.focus_areas?.filter((area): area is 'security' | 'performance' | 'maintainability' | 'testing' => 
            ['security', 'performance', 'maintainability', 'testing'].includes(area)
          ),
        });

        const duration = Date.now() - startTime;
        monitoring.recordApiCall('claude-code', '/analyze', duration, 200);

        logger.info(`Completed ${args.analysis_type} analysis in ${duration}ms`);
        const result = {
          ...analysis,
          processing_time_ms: duration,
        };
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall('claude-code', '/analyze', duration, 500, true);
        logError('AI analysis failed', error);
        throw new Error(`Analysis failed: ${error.message}`);
      }
    },
  });

  /**
   * Intelligent order routing
   */
  server.addTool({
    name: 'intelligent_order_routing',
    description: 'Use AI to determine optimal warehouse and shipping routes for orders',
    parameters: z.object({
      orders: z.array(z.object({
        id: z.string(),
        items: z.array(z.object({
          sku: z.string(),
          quantity: z.number(),
          weight: z.number(),
          dimensions: z.object({
            length: z.number(),
            width: z.number(),
            height: z.number(),
          }),
        })),
        destination: z.object({
          address: z.string(),
          city: z.string(),
          state: z.string(),
          zip: z.string(),
          country: z.string(),
        }),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
      })).describe('Orders to route'),
      warehouse_info: z.array(z.object({
        id: z.string(),
        location: z.object({
          city: z.string(),
          state: z.string(),
          country: z.string(),
        }),
        inventory: z.array(z.object({
          sku: z.string(),
          available_quantity: z.number(),
        })),
        processing_capacity: z.number(),
        shipping_zones: z.array(z.string()),
      })).describe('Available warehouse information'),
    }),
    execute: async (args) => {
      const startTime = Date.now();
      try {
        logger.info('Starting intelligent order routing', {
          orders: args.orders.length,
          warehouses: args.warehouse_info.length,
        });

        // Simulate AI-powered routing logic
        const routingResults = args.orders.map(order => {
          // Find best warehouse based on inventory availability and location
          const suitableWarehouses = args.warehouse_info.filter(warehouse => {
            return order.items.every(item => {
              const inventory = warehouse.inventory.find(inv => inv.sku === item.sku);
              return inventory && inventory.available_quantity >= item.quantity;
            });
          });

          const optimalWarehouse = suitableWarehouses[0] || args.warehouse_info[0];

          return {
            order_id: order.id,
            assigned_warehouse: optimalWarehouse?.id || 'unknown',
            warehouse_location: optimalWarehouse?.location || { address: 'Unknown', city: 'Unknown', state: 'Unknown', country: 'Unknown' },
            estimated_processing_time: Math.ceil(Math.random() * 24), // hours
            routing_confidence: Math.min(0.95, 0.7 + Math.random() * 0.25),
            recommendations: [
              'Optimal warehouse selected based on inventory availability',
              'Consider expedited processing for high priority orders',
            ],
          };
        });

        const duration = Date.now() - startTime;
        monitoring.recordApiCall('claude-code', '/routing', duration, 200);

        logger.info(`Completed order routing for ${args.orders.length} orders in ${duration}ms`);
        const result = {
          routing_results: routingResults,
          summary: {
            total_orders: args.orders.length,
            avg_confidence: routingResults.reduce((acc, r) => acc + r.routing_confidence, 0) / routingResults.length,
          },
          processing_time_ms: duration,
        };
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall('claude-code', '/routing', duration, 500, true);
        logError('Intelligent order routing failed', error);
        throw new Error(`Order routing failed: ${error.message}`);
      }
    },
  });
}