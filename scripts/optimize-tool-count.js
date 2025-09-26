#!/usr/bin/env node

/**
 * MCP Tool Count Optimization Script
 * Analyzes current tools and provides optimization recommendations
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

class ToolOptimizer {
  constructor() {
    this.tools = [];
    this.optimizationPlan = {};
    this.analysis = {};
  }

  async analyzeCurrentTools() {
    console.log('🔍 Analyzing current MCP tools...');
    
    // Read tool files
    const shippingTools = this.extractToolsFromFile('src/server/tools/shipping.ts');
    const inventoryTools = this.extractToolsFromFile('src/server/tools/inventory.ts');
    const fedexTools = this.extractToolsFromFile('src/server/tools/fedex-validation.ts');
    const coreTools = this.extractToolsFromFile('src/core/tools/index.ts');

    this.tools = [
      ...shippingTools,
      ...inventoryTools,
      ...fedexTools,
      ...coreTools
    ];

    console.log(`📊 Found ${this.tools.length} total tools`);
    return this.tools;
  }

  extractToolsFromFile(filePath) {
    try {
      const content = readFileSync(filePath, 'utf8');
      const toolMatches = content.match(/server\.addTool\(\s*{\s*name:\s*["']([^"']+)["']/g);
      
      if (!toolMatches) return [];
      
      return toolMatches.map(match => {
        const nameMatch = match.match(/name:\s*["']([^"']+)["']/);
        return {
          name: nameMatch ? nameMatch[1] : 'unknown',
          file: filePath,
          category: this.categorizeTool(nameMatch ? nameMatch[1] : 'unknown')
        };
      });
    } catch (error) {
      console.warn(`⚠️  Could not read ${filePath}: ${error.message}`);
      return [];
    }
  }

  categorizeTool(toolName) {
    if (toolName.includes('shipping') || toolName.includes('rate') || toolName.includes('label')) {
      return 'shipping';
    }
    if (toolName.includes('product') || toolName.includes('inventory') || toolName.includes('warehouse')) {
      return 'inventory';
    }
    if (toolName.includes('fedex') || toolName.includes('validate')) {
      return 'validation';
    }
    if (toolName.includes('health') || toolName.includes('weight') || toolName.includes('address')) {
      return 'core';
    }
    return 'other';
  }

  generateOptimizationPlan() {
    console.log('🎯 Generating optimization plan...');
    
    const categories = this.groupToolsByCategory();
    
    this.optimizationPlan = {
      current: {
        total: this.tools.length,
        byCategory: categories
      },
      optimized: {
        total: 0,
        byCategory: {}
      },
      recommendations: []
    };

    // Core tools - keep as-is (4 tools)
    this.optimizationPlan.optimized.byCategory.core = categories.core;
    this.optimizationPlan.optimized.total += categories.core.length;

    // Shipping tools - consolidate to 12 tools
    this.optimizationPlan.optimized.byCategory.shipping = this.optimizeShippingTools(categories.shipping);
    this.optimizationPlan.optimized.total += this.optimizationPlan.optimized.byCategory.shipping.length;

    // Inventory tools - consolidate to 18 tools
    this.optimizationPlan.optimized.byCategory.inventory = this.optimizeInventoryTools(categories.inventory);
    this.optimizationPlan.optimized.total += this.optimizationPlan.optimized.byCategory.inventory.length;

    // Validation tools - keep as-is (1 tool)
    this.optimizationPlan.optimized.byCategory.validation = categories.validation;
    this.optimizationPlan.optimized.total += categories.validation.length;

    // Generate recommendations
    this.generateRecommendations();

    return this.optimizationPlan;
  }

  groupToolsByCategory() {
    const categories = {
      core: [],
      shipping: [],
      inventory: [],
      validation: [],
      other: []
    };

    this.tools.forEach(tool => {
      categories[tool.category] = categories[tool.category] || [];
      categories[tool.category].push(tool);
    });

    return categories;
  }

  optimizeShippingTools(shippingTools) {
    // Consolidate shipping tools into 12 unified tools
    return [
      {
        name: 'shipping_rates',
        description: 'Calculate and compare shipping rates from multiple carriers',
        consolidates: shippingTools.filter(t => t.name.includes('rate') || t.name.includes('calculate'))
      },
      {
        name: 'shipping_management',
        description: 'Create, update, and manage shipments',
        consolidates: shippingTools.filter(t => t.name.includes('shipment') || t.name.includes('label'))
      },
      {
        name: 'shipping_tracking',
        description: 'Track shipments and get delivery details',
        consolidates: shippingTools.filter(t => t.name.includes('track'))
      },
      {
        name: 'address_validation',
        description: 'Validate and normalize shipping addresses',
        consolidates: shippingTools.filter(t => t.name.includes('address'))
      },
      {
        name: 'carrier_management',
        description: 'Manage carriers and carrier accounts',
        consolidates: shippingTools.filter(t => t.name.includes('carrier'))
      },
      {
        name: 'webhook_management',
        description: 'Handle all webhook operations',
        consolidates: shippingTools.filter(t => t.name.includes('webhook'))
      },
      {
        name: 'batch_operations',
        description: 'Manage batch shipments and operations',
        consolidates: shippingTools.filter(t => t.name.includes('batch'))
      },
      {
        name: 'pickup_management',
        description: 'Schedule and manage package pickups',
        consolidates: shippingTools.filter(t => t.name.includes('pickup'))
      },
      {
        name: 'insurance_management',
        description: 'Handle insurance options and claims',
        consolidates: shippingTools.filter(t => t.name.includes('insurance'))
      },
      {
        name: 'customs_management',
        description: 'Manage customs information and duties',
        consolidates: shippingTools.filter(t => t.name.includes('customs'))
      },
      {
        name: 'billing_management',
        description: 'Handle billing and payment operations',
        consolidates: shippingTools.filter(t => t.name.includes('billing') || t.name.includes('credit'))
      },
      {
        name: 'account_management',
        description: 'Manage account settings and information',
        consolidates: shippingTools.filter(t => t.name.includes('account') || t.name.includes('usage'))
      }
    ];
  }

  optimizeInventoryTools(inventoryTools) {
    // Consolidate inventory tools into 18 unified tools
    return [
      {
        name: 'product_management',
        description: 'CRUD operations for products',
        consolidates: inventoryTools.filter(t => t.name.includes('product'))
      },
      {
        name: 'inventory_management',
        description: 'Track and update inventory levels',
        consolidates: inventoryTools.filter(t => t.name.includes('inventory') || t.name.includes('level'))
      },
      {
        name: 'warehouse_management',
        description: 'Manage warehouses and locations',
        consolidates: inventoryTools.filter(t => t.name.includes('warehouse') || t.name.includes('location'))
      },
      {
        name: 'supplier_management',
        description: 'Manage suppliers and relationships',
        consolidates: inventoryTools.filter(t => t.name.includes('supplier'))
      },
      {
        name: 'order_management',
        description: 'Process and manage orders',
        consolidates: inventoryTools.filter(t => t.name.includes('order'))
      },
      {
        name: 'customer_management',
        description: 'Manage customer data',
        consolidates: inventoryTools.filter(t => t.name.includes('customer'))
      },
      {
        name: 'sales_channel_management',
        description: 'Manage sales channels',
        consolidates: inventoryTools.filter(t => t.name.includes('sales_channel'))
      },
      {
        name: 'brand_management',
        description: 'Manage brands and categories',
        consolidates: inventoryTools.filter(t => t.name.includes('brand') || t.name.includes('category'))
      },
      {
        name: 'tag_management',
        description: 'Manage tags and labels',
        consolidates: inventoryTools.filter(t => t.name.includes('tag'))
      },
      {
        name: 'stock_movement_management',
        description: 'Track stock movements and transfers',
        consolidates: inventoryTools.filter(t => t.name.includes('stock_movement') || t.name.includes('transfer'))
      },
      {
        name: 'purchase_order_management',
        description: 'Manage purchase orders',
        consolidates: inventoryTools.filter(t => t.name.includes('purchase_order'))
      },
      {
        name: 'receipt_management',
        description: 'Handle receipts and returns',
        consolidates: inventoryTools.filter(t => t.name.includes('receipt') || t.name.includes('return'))
      },
      {
        name: 'allocation_management',
        description: 'Manage order allocations',
        consolidates: inventoryTools.filter(t => t.name.includes('allocation'))
      },
      {
        name: 'fulfillment_management',
        description: 'Handle order fulfillment',
        consolidates: inventoryTools.filter(t => t.name.includes('fulfillment'))
      },
      {
        name: 'dispatch_management',
        description: 'Manage order dispatching',
        consolidates: inventoryTools.filter(t => t.name.includes('dispatch'))
      },
      {
        name: 'shipment_management',
        description: 'Manage shipments and tracking',
        consolidates: inventoryTools.filter(t => t.name.includes('shipment'))
      },
      {
        name: 'note_management',
        description: 'Handle notes and attachments',
        consolidates: inventoryTools.filter(t => t.name.includes('note') || t.name.includes('attachment'))
      },
      {
        name: 'webhook_management',
        description: 'Manage webhooks and events',
        consolidates: inventoryTools.filter(t => t.name.includes('webhook'))
      }
    ];
  }

  generateRecommendations() {
    const currentTotal = this.optimizationPlan.current.total;
    const optimizedTotal = this.optimizationPlan.optimized.total;
    const reduction = ((currentTotal - optimizedTotal) / currentTotal * 100).toFixed(1);

    this.optimizationPlan.recommendations = [
      {
        type: 'consolidation',
        description: `Consolidate ${currentTotal} tools into ${optimizedTotal} tools (${reduction}% reduction)`,
        impact: 'high',
        effort: 'medium'
      },
      {
        type: 'performance',
        description: 'Reduce memory usage and startup time',
        impact: 'medium',
        effort: 'low'
      },
      {
        type: 'maintenance',
        description: 'Simplify tool maintenance and updates',
        impact: 'high',
        effort: 'low'
      },
      {
        type: 'developer_experience',
        description: 'Improve developer experience with fewer tools to learn',
        impact: 'medium',
        effort: 'low'
      }
    ];
  }

  generateReport() {
    console.log('\n📊 MCP Tool Optimization Report');
    console.log('================================');
    
    console.log(`\n📈 Current State:`);
    console.log(`  Total Tools: ${this.optimizationPlan.current.total}`);
    Object.entries(this.optimizationPlan.current.byCategory).forEach(([category, tools]) => {
      console.log(`  ${category}: ${tools.length} tools`);
    });

    console.log(`\n🎯 Optimized State:`);
    console.log(`  Total Tools: ${this.optimizationPlan.optimized.total}`);
    Object.entries(this.optimizationPlan.optimized.byCategory).forEach(([category, tools]) => {
      if (Array.isArray(tools)) {
        console.log(`  ${category}: ${tools.length} tools`);
      } else {
        console.log(`  ${category}: ${tools.length} tools`);
      }
    });

    const reduction = ((this.optimizationPlan.current.total - this.optimizationPlan.optimized.total) / this.optimizationPlan.current.total * 100).toFixed(1);
    console.log(`\n🚀 Optimization Results:`);
    console.log(`  Tool Reduction: ${reduction}%`);
    console.log(`  Tools Removed: ${this.optimizationPlan.current.total - this.optimizationPlan.optimized.total}`);

    console.log(`\n💡 Recommendations:`);
    this.optimizationPlan.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec.description} (${rec.impact} impact, ${rec.effort} effort)`);
    });

    // Save detailed report
    const reportPath = 'tool-optimization-report.json';
    writeFileSync(reportPath, JSON.stringify(this.optimizationPlan, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  async run() {
    try {
      await this.analyzeCurrentTools();
      this.generateOptimizationPlan();
      this.generateReport();
      
      console.log('\n✅ Tool optimization analysis complete!');
    } catch (error) {
      console.error('❌ Error during optimization analysis:', error);
      process.exit(1);
    }
  }
}

// Run the optimizer
const optimizer = new ToolOptimizer();
optimizer.run();