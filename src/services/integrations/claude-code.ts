/**
 * Claude Code SDK Integration
 *
 * This module provides AI-powered shipping optimization and code analysis
 * using the Claude Code SDK instead of the Anthropic API.
 */

import { claude } from '@instantlyeasy/claude-code-sdk-ts';

import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

import { checkClaudeAuthStatus } from './claude-oauth.js';

// Import Claude Code SDK

export interface ShippingOptimizationRequest {
  package: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    value?: number;
    contents?: string;
  };
  requirements: {
    delivery_time?: 'standard' | 'expedited' | 'overnight';
    cost_priority?: 'lowest' | 'balanced' | 'fastest';
    carrier_preference?: string[];
    insurance_required?: boolean;
  };
  origin: string;
  destination: string;
  business_context?: {
    industry?: string;
    customer_type?: 'b2b' | 'b2c';
    volume?: 'low' | 'medium' | 'high';
  };
}

export interface ShippingOptimizationResult {
  recommendations: {
    carrier: string;
    service: string;
    estimated_cost: number;
    estimated_delivery_days: number;
    confidence_score: number;
    reasoning: string;
  }[];
  alternative_options: {
    carrier: string;
    service: string;
    estimated_cost: number;
    estimated_delivery_days: number;
    trade_offs: string[];
  }[];
  risk_assessment: {
    carrier_reliability: number;
    delivery_guarantee: boolean;
    insurance_coverage: number;
    weather_impact: 'low' | 'medium' | 'high';
  };
  cost_analysis: {
    total_estimated_cost: number;
    cost_breakdown: {
      base_shipping: number;
      fuel_surcharge?: number;
      insurance?: number;
      additional_fees?: number;
    };
    savings_potential: number;
  };
}

export interface CodeAnalysisRequest {
  code: string;
  language: 'typescript' | 'javascript' | 'python' | 'java';
  context: 'shipping' | 'inventory' | 'general';
  focus_areas?: ('security' | 'performance' | 'maintainability' | 'testing')[];
}

export interface CodeAnalysisResult {
  overall_score: number;
  security_analysis: {
    score: number;
    issues: {
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      recommendation: string;
      line_number?: number;
    }[];
  };
  performance_analysis: {
    score: number;
    bottlenecks: {
      description: string;
      impact: 'low' | 'medium' | 'high';
      recommendation: string;
    }[];
  };
  maintainability_analysis: {
    score: number;
    suggestions: {
      type: 'refactor' | 'documentation' | 'structure';
      description: string;
      priority: 'low' | 'medium' | 'high';
    }[];
  };
  testing_recommendations: {
    coverage_areas: string[];
    test_types: ('unit' | 'integration' | 'e2e')[];
    priority_tests: string[];
  };
}

export interface ShippingRecommendation {
  scenario: string;
  recommendation: string;
  reasoning: string;
  implementation_tips: string[];
  expected_benefits: string[];
}

/**
 * Optimize shipping using Claude Code SDK
 */
export async function optimizeShipping(
  request: ShippingOptimizationRequest
): Promise<ShippingOptimizationResult> {
  // Check OAuth authentication instead of API key
  const authStatus = await checkClaudeAuthStatus();
  if (!config.ai.enableAI || !authStatus.isAuthenticated) {
    logger.warn(
      {
        enableAI: config.ai.enableAI,
        isAuthenticated: authStatus.isAuthenticated,
        user: authStatus.user,
      },
      'AI features disabled or Claude Code not authenticated, returning mock optimization result'
    );
    return getMockShippingOptimization(request);
  }

  try {
    logger.info(
      {
        origin: request.origin,
        destination: request.destination,
        weight: request.package.weight,
      },
      'Optimizing shipping with Claude Code SDK'
    );

    // Use Claude Code SDK for shipping optimization
    const prompt = `Analyze this shipping scenario and provide optimization recommendations:

Package Details:
- Weight: ${request.package.weight} lbs
- Dimensions: ${request.package.dimensions.length}" x ${request.package.dimensions.width}" x ${request.package.dimensions.height}"
- Value: $${request.package.value || 'Not specified'}
- Contents: ${request.package.contents || 'Not specified'}

Route: ${request.origin} → ${request.destination}

Requirements:
- Delivery Time: ${request.requirements.delivery_time || 'standard'}
- Cost Priority: ${request.requirements.cost_priority || 'balanced'}
- Carrier Preference: ${request.requirements.carrier_preference?.join(', ') || 'Any'}
- Insurance Required: ${request.requirements.insurance_required || false}

Business Context:
- Industry: ${request.business_context?.industry || 'Not specified'}
- Customer Type: ${request.business_context?.customer_type || 'Not specified'}
- Volume: ${request.business_context?.volume || 'Not specified'}

Please provide detailed shipping optimization recommendations including:
1. Best carrier and service options
2. Cost analysis and breakdown
3. Risk assessment
4. Alternative options with trade-offs
5. Implementation recommendations

Format the response as a structured JSON object.`;

    const response = await claude()
      .withModel(config.ai.claudeModel || 'claude-3-5-sonnet-20241022')
      .query(prompt)
      .asText();

    // Parse the response and return structured result
    try {
      const parsedResponse = JSON.parse(response);
      return parsedResponse as ShippingOptimizationResult;
    } catch (parseError) {
      logger.warn(
        {
          parseError,
        },
        'Failed to parse Claude response, using mock result'
      );
      return getMockShippingOptimization(request);
    }
  } catch (error: any) {
    logger.error(
      {
        error: (error as Error).message,
        request: request,
      },
      'Failed to optimize shipping with Claude Code SDK'
    );

    // Fallback to mock response
    return getMockShippingOptimization(request);
  }
}

/**
 * Analyze code using Claude Code SDK
 */
export async function analyzeCode(request: CodeAnalysisRequest): Promise<CodeAnalysisResult> {
  // Check OAuth authentication instead of API key
  const authStatus = await checkClaudeAuthStatus();
  if (!config.ai.enableAI || !authStatus.isAuthenticated) {
    logger.warn(
      {
        enableAI: config.ai.enableAI,
        isAuthenticated: authStatus.isAuthenticated,
        user: authStatus.user,
      },
      'AI features disabled or Claude Code not authenticated, returning mock code analysis'
    );
    return getMockCodeAnalysis(request);
  }

  try {
    logger.info(
      {
        language: request.language,
        context: request.context,
        codeLength: request.code.length,
      },
      'Analyzing code with Claude Code SDK'
    );

    const focusAreas =
      request.focus_areas?.join(', ') || 'security, performance, maintainability, testing';

    const prompt = `Analyze this ${request.language} code in the context of ${request.context} systems:

Focus Areas: ${focusAreas}

Code:
\`\`\`${request.language}
${request.code}
\`\`\`

Please provide a comprehensive code analysis including:

1. **Security Analysis** (score 0-100):
   - Identify security vulnerabilities
   - Rate severity (low/medium/high/critical)
   - Provide specific recommendations

2. **Performance Analysis** (score 0-100):
   - Identify performance bottlenecks
   - Assess impact (low/medium/high)
   - Suggest optimizations

3. **Maintainability Analysis** (score 0-100):
   - Code structure and organization
   - Documentation quality
   - Refactoring suggestions

4. **Testing Recommendations**:
   - Coverage areas needed
   - Test types (unit/integration/e2e)
   - Priority tests to implement

5. **Overall Score** (0-100):
   - Weighted average considering all factors

Format the response as a structured JSON object with the following structure:
{
  "overall_score": number,
  "security_analysis": {
    "score": number,
    "issues": [{"severity": string, "description": string, "recommendation": string, "line_number": number}]
  },
  "performance_analysis": {
    "score": number,
    "bottlenecks": [{"description": string, "impact": string, "recommendation": string}]
  },
  "maintainability_analysis": {
    "score": number,
    "suggestions": [{"type": string, "description": string, "priority": string}]
  },
  "testing_recommendations": {
    "coverage_areas": [string],
    "test_types": [string],
    "priority_tests": [string]
  }
}`;

    const response = await claude()
      .withModel(config.ai.claudeModel || 'claude-3-5-sonnet-20241022')
      .query(prompt)
      .asText();

    // Parse the response and return structured result
    try {
      const parsedResponse = JSON.parse(response);
      return parsedResponse as CodeAnalysisResult;
    } catch (parseError) {
      logger.warn(
        {
          parseError,
        },
        'Failed to parse Claude response, using mock result'
      );
      return getMockCodeAnalysis(request);
    }
  } catch (error: any) {
    logger.error(
      {
        error: (error as Error).message,
        language: request.language,
      },
      'Failed to analyze code with Claude Code SDK'
    );

    // Fallback to mock response
    return getMockCodeAnalysis(request);
  }
}

/**
 * Generate shipping recommendations using Claude Code SDK
 */
export async function generateShippingRecommendations(
  context: string,
  requirements: string[]
): Promise<ShippingRecommendation[]> {
  if (!config.ai.enableAI || !config.ai.claudeCodeApiKey) {
    logger.warn('AI features disabled or API key missing, returning mock recommendations');
    return getMockShippingRecommendations(context, requirements);
  }

  try {
    logger.info(
      {
        context,
        requirementsCount: requirements.length,
      },
      'Generating shipping recommendations with Claude Code SDK'
    );

    const prompt = `Generate shipping optimization recommendations for the following scenario:

Context: ${context}

Requirements:
${requirements.map((req, index) => `${index + 1}. ${req}`).join('\n')}

Please provide detailed shipping recommendations including:

1. **Scenario Analysis**: Identify the specific shipping scenario
2. **Recommendation**: Provide a clear, actionable recommendation
3. **Reasoning**: Explain why this recommendation is optimal
4. **Implementation Tips**: Step-by-step implementation guidance
5. **Expected Benefits**: Quantified benefits and improvements

For each recommendation, consider:
- Cost optimization opportunities
- Delivery time improvements
- Risk mitigation strategies
- Scalability considerations
- Integration requirements
- Maintenance considerations

Format the response as a JSON array of recommendation objects:
[
  {
    "scenario": "string",
    "recommendation": "string",
    "reasoning": "string",
    "implementation_tips": ["string"],
    "expected_benefits": ["string"]
  }
]

Provide 2-3 high-impact recommendations that address the specific context and requirements.`;

    const response = await claude()
      .withModel(config.ai.claudeModel || 'claude-3-5-sonnet-20241022')
      .query(prompt)
      .asText();

    // Parse the response and return structured result
    try {
      const parsedResponse = JSON.parse(response);
      return parsedResponse as ShippingRecommendation[];
    } catch (parseError) {
      logger.warn(
        {
          parseError,
        },
        'Failed to parse Claude response, using mock result'
      );
      return getMockShippingRecommendations(context, requirements);
    }
  } catch (error: any) {
    logger.error(
      {
        error: (error as Error).message,
        context,
      },
      'Failed to generate shipping recommendations'
    );

    // Fallback to mock response
    return getMockShippingRecommendations(context, requirements);
  }
}

/**
 * Mock shipping optimization for development/testing
 */
function getMockShippingOptimization(
  request: ShippingOptimizationRequest
): ShippingOptimizationResult {
  const baseCost = request.package.weight * 2.5;
  const distanceMultiplier =
    request.origin.includes('NY') && request.destination.includes('CA') ? 1.5 : 1.0;

  return {
    recommendations: [
      {
        carrier: 'UPS',
        service: 'Ground',
        estimated_cost: baseCost * distanceMultiplier,
        estimated_delivery_days: 3,
        confidence_score: 0.85,
        reasoning: 'Best balance of cost and reliability for this package size and route',
      },
      {
        carrier: 'FedEx',
        service: 'Home Delivery',
        estimated_cost: baseCost * distanceMultiplier * 1.1,
        estimated_delivery_days: 2,
        confidence_score: 0.78,
        reasoning: 'Faster delivery with slightly higher cost',
      },
    ],
    alternative_options: [
      {
        carrier: 'USPS',
        service: 'Priority Mail',
        estimated_cost: baseCost * distanceMultiplier * 0.8,
        estimated_delivery_days: 2,
        trade_offs: ['Lower cost', 'Less tracking detail', 'Limited insurance options'],
      },
    ],
    risk_assessment: {
      carrier_reliability: 0.92,
      delivery_guarantee: true,
      insurance_coverage: 100,
      weather_impact: 'low',
    },
    cost_analysis: {
      total_estimated_cost: baseCost * distanceMultiplier,
      cost_breakdown: {
        base_shipping: baseCost * distanceMultiplier * 0.8,
        fuel_surcharge: baseCost * distanceMultiplier * 0.1,
        insurance: baseCost * distanceMultiplier * 0.1,
      },
      savings_potential: baseCost * distanceMultiplier * 0.2,
    },
  };
}

/**
 * Mock code analysis for development/testing
 */
function getMockCodeAnalysis(_request: CodeAnalysisRequest): CodeAnalysisResult {
  return {
    overall_score: 85,
    security_analysis: {
      score: 90,
      issues: [
        {
          severity: 'medium',
          description: 'API key exposed in environment variable without validation',
          recommendation: 'Add input validation and use secure key management',
          line_number: 15,
        },
      ],
    },
    performance_analysis: {
      score: 80,
      bottlenecks: [
        {
          description: 'Synchronous API calls in shipping rate calculation',
          impact: 'medium',
          recommendation: 'Implement parallel API calls or caching for better performance',
        },
      ],
    },
    maintainability_analysis: {
      score: 88,
      suggestions: [
        {
          type: 'documentation',
          description: 'Add JSDoc comments to public methods',
          priority: 'medium',
        },
        {
          type: 'structure',
          description: 'Consider extracting shipping logic into separate service class',
          priority: 'low',
        },
      ],
    },
    testing_recommendations: {
      coverage_areas: ['API integration', 'Error handling', 'Data validation'],
      test_types: ['unit', 'integration'],
      priority_tests: ['Shipping rate calculation', 'Address validation', 'Error scenarios'],
    },
  };
}

/**
 * Mock shipping recommendations for development/testing
 */
function getMockShippingRecommendations(
  _context: string,
  _requirements: string[]
): ShippingRecommendation[] {
  return [
    {
      scenario: 'High-volume e-commerce shipping',
      recommendation: 'Implement carrier rate shopping with caching',
      reasoning: 'Reduces API calls and improves response times for high-volume scenarios',
      implementation_tips: [
        'Cache rates for 1 hour',
        'Use Redis for distributed caching',
        'Implement fallback carriers',
      ],
      expected_benefits: [
        '30% reduction in API response time',
        'Lower API costs',
        'Improved user experience',
      ],
    },
    {
      scenario: 'International shipping optimization',
      recommendation: 'Use multi-carrier approach with customs optimization',
      reasoning: 'Different carriers excel in different regions and customs handling',
      implementation_tips: [
        'Route by destination country',
        'Pre-calculate customs duties',
        'Use carrier-specific customs forms',
      ],
      expected_benefits: [
        '20% cost reduction on international shipments',
        'Faster customs clearance',
        'Better delivery reliability',
      ],
    },
  ];
}

/**
 * Initialize Claude Code SDK (placeholder for future implementation)
 */
export async function initializeClaudeCodeSDK(): Promise<void> {
  if (!config.ai.enableAI) {
    logger.info('Claude Code SDK initialization skipped - AI features disabled');
    return;
  }

  // Use OAuth authentication instead of API key
  const authStatus = await checkClaudeAuthStatus();
  if (!authStatus.isAuthenticated) {
    logger.warn(
      {
        isAuthenticated: authStatus.isAuthenticated,
        error: authStatus.error,
      },
      'Claude Code SDK initialization skipped - OAuth authentication required'
    );
    return;
  }

  try {
    // Test the Claude Code SDK connection
    const testResponse = await claude()
      .withModel(config.ai.claudeModel || 'claude-3-5-sonnet-20241022')
      .query('Hello, this is a test connection.')
      .asText();

    if (testResponse) {
      logger.info('Claude Code SDK initialized successfully');
    } else {
      throw new Error('No response received from Claude Code SDK');
    }
  } catch (error: any) {
    logger.error(
      {
        error: (error as Error).message,
      },
      'Failed to initialize Claude Code SDK'
    );
    throw error;
  }
}

/**
 * Health check for Claude Code SDK
 */
export async function checkClaudeCodeSDKHealth(): Promise<boolean> {
  if (!config.ai.enableAI) {
    return true; // Consider healthy if disabled
  }

  if (!config.ai.claudeCodeApiKey) {
    return false; // Not healthy if API key is missing
  }

  try {
    // Perform a simple health check by making a minimal request
    const healthResponse = await claude()
      .withModel(config.ai.claudeModel || 'claude-3-5-sonnet-20241022')
      .query('Health check')
      .asText();

    return Boolean(healthResponse && healthResponse.length > 0);
  } catch (error: any) {
    logger.error(
      {
        error: (error as Error).message,
      },
      'Claude Code SDK health check failed'
    );
    return false;
  }
}
