/**
 * ESLint Plugin for FastMCP Servers
 * Custom rules for FastMCP server development best practices
 */

module.exports = {
  rules: {
    'tool-naming-convention': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Enforce consistent naming convention for FastMCP tools',
          category: 'Best Practices',
        },
        fixable: null,
        schema: [],
      },
      create(context) {
        return {
          CallExpression(node) {
            if (
              node.callee?.type === 'MemberExpression' &&
              node.callee?.property?.name === 'addTool' &&
              node.arguments?.[0]?.type === 'ObjectExpression'
            ) {
              const nameProperty = node.arguments[0].properties.find(
                (prop) => prop.key?.name === 'name'
              );

              if (nameProperty?.value?.type === 'Literal') {
                const toolName = nameProperty.value.value;
                // Check for snake_case naming
                if (!/^[a-z][a-z0-9_]*[a-z0-9]$/.test(toolName)) {
                  context.report({
                    node: nameProperty.value,
                    message: `Tool name '${toolName}' should use snake_case convention (e.g., 'calculate_shipping_rates')`,
                  });
                }

                // Check for descriptive names
                if (toolName.length < 3) {
                  context.report({
                    node: nameProperty.value,
                    message: `Tool name '${toolName}' should be more descriptive (minimum 3 characters)`,
                  });
                }
              }
            }
          },
        };
      },
    },

    'proper-error-handling': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Ensure proper error handling in FastMCP tool implementations',
          category: 'Possible Errors',
        },
        fixable: null,
        schema: [],
      },
      create(context) {
        return {
          CallExpression(node) {
            if (
              node.callee?.type === 'MemberExpression' &&
              node.callee?.property?.name === 'addTool'
            ) {
              const executeProperty = node.arguments?.[0]?.properties?.find(
                (prop) => prop.key?.name === 'execute'
              );

              if (
                executeProperty?.value?.type === 'ArrowFunctionExpression' ||
                executeProperty?.value?.type === 'FunctionExpression'
              ) {
                const functionBody = executeProperty.value.body;

                // Check if the function has try-catch block
                if (functionBody?.type === 'BlockStatement') {
                  const hasTryCatch = functionBody.body.some(
                    (stmt) => stmt.type === 'TryStatement'
                  );

                  if (!hasTryCatch) {
                    context.report({
                      node: executeProperty.value,
                      message:
                        'FastMCP tool execute function should include proper error handling with try-catch blocks',
                    });
                  }
                }
              }
            }
          },
        };
      },
    },

    'resource-template-validation': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Validate FastMCP resource template configurations',
          category: 'Possible Errors',
        },
        fixable: null,
        schema: [],
      },
      create(context) {
        return {
          CallExpression(node) {
            if (
              node.callee?.type === 'MemberExpression' &&
              node.callee?.property?.name === 'addResourceTemplate'
            ) {
              const configObj = node.arguments?.[0];
              if (configObj?.type === 'ObjectExpression') {
                const requiredProps = ['uriTemplate', 'name', 'mimeType', 'load'];
                const presentProps = configObj.properties.map((prop) => prop.key?.name);

                requiredProps.forEach((prop) => {
                  if (!presentProps.includes(prop)) {
                    context.report({
                      node: configObj,
                      message: `Resource template missing required property: ${prop}`,
                    });
                  }
                });
              }
            }
          },
        };
      },
    },

    'streaming-best-practices': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Encourage proper streaming patterns in FastMCP tools',
          category: 'Best Practices',
        },
        fixable: null,
        schema: [],
      },
      create(context) {
        return {
          CallExpression(node) {
            if (
              node.callee?.type === 'MemberExpression' &&
              node.callee?.property?.name === 'addTool'
            ) {
              const executeProperty = node.arguments?.[0]?.properties?.find(
                (prop) => prop.key?.name === 'execute'
              );

              if (executeProperty?.value) {
                const params = executeProperty.value.params;
                if (params?.length >= 2) {
                  const contextParam = params[1];
                  if (contextParam?.type === 'ObjectPattern') {
                    const hasStreamContent = contextParam.properties.some(
                      (prop) => prop.key?.name === 'streamContent'
                    );
                    const hasReportProgress = contextParam.properties.some(
                      (prop) => prop.key?.name === 'reportProgress'
                    );

                    if (!hasStreamContent && !hasReportProgress) {
                      context.report({
                        node: executeProperty.value,
                        message:
                          'Consider using streamContent and reportProgress for better user experience in long-running operations',
                      });
                    }
                  }
                }
              }
            }
          },
        };
      },
    },
  },
};
