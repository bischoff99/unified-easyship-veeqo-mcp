import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";

export default [
  // Base configuration for all files
  js.configs.recommended,

  // TypeScript configuration
  {
    files: ["**/*.ts", "**/*.js"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: "./tsconfig.eslint.json",
      },
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        NodeJS: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        Response: "readonly",
        RequestInit: "readonly",
        URLSearchParams: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      import: importPlugin,
    },
    rules: {
      // TypeScript specific rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/prefer-optional-chain": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/await-thenable": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/only-throw-error": "off",
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/prefer-readonly": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-imports": "off",

      // General rules
      "no-console": "off", // Allow console for FastMCP logging
      "prefer-const": "error",
      "no-var": "error",
      "no-param-reassign": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
      "brace-style": ["error", "1tbs"],
      "comma-dangle": "off",
      indent: "off",
      quotes: "off",
      semi: ["error", "always"],

      // Security rules for API integrations
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",

      // Import rules for better module organization
      "import/order": "off",
      "import/no-duplicates": "error",
      "import/no-unused-modules": "warn",
      "import/no-cycle": "error",
    },
  },

  // Test files configuration
  {
    files: ["*.test.ts", "*.spec.ts", "test-*.ts", "test/**/*"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "import/no-unused-modules": "off",
    },
  },

  // FastMCP server specific configuration
  {
    files: ["src/server/fastmcp-server.ts"],
    rules: {
      "max-lines": [
        "warn",
        {
          max: 2000,
          skipComments: true,
        },
      ],
      "max-lines-per-function": "off",
      complexity: "off",
    },
  },

  // Services clients configuration
  {
    files: ["src/services/clients/*.ts"],
    rules: {
      "@typescript-eslint/no-floating-promises": "off",
      "no-magic-numbers": "off",
    },
  },

  // Error/constants files - allow unused exports for error constants
  {
    files: ["**/errors.ts", "**/error-codes.ts"],
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },

  // Ignore patterns
  {
    ignores: [
      "scripts/**/*",
      "docs/**/*",
      "test/**/*",
      "tests/**/*",
      "archive/**/*",
      "eslint-plugin-fastmcp/**/*",
      "node_modules/**/*",
      "dist/**/*",
      "build/**/*",
      "coverage/**/*",
      "*.log",
      ".env",
      ".env.*",
      "*.min.js",
      "*.bundle.js",
      "*.js",
    ],
  },
];
