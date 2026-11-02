import eslint from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/dist',
      'node_modules',
      'coverage',
      'playwright-report',
      'test-results',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // Code organization (see CLAUDE.md). The core is pure detection logic, the
  // backend and frontend build on it, and the two apps talk only over HTTP.
  {
    files: ['packages/shared/src/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(?!\\.{1,2}/)',
              message:
                'The core (packages/shared) is pure: import only its own modules, never packages or Node.js APIs.',
            },
            {
              group: ['**/apps/**'],
              message: 'The core never imports backend or frontend code.',
            },
          ],
        },
      ],
      'no-console': 'error',
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'The core is deterministic.',
        },
        {
          object: 'Date',
          property: 'now',
          message: 'The core is deterministic.',
        },
      ],
    },
  },
  {
    files: ['apps/api/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-dom',
                'react-dom/*',
                '**/apps/web/**',
                '**/web/src/**',
              ],
              message: 'The backend never imports frontend code.',
            },
            {
              group: ['**/packages/**'],
              message:
                'Import the core by package name (@charaicter/shared/...).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@charaicter/shared/*'],
              allowTypeImports: true,
              message:
                'Analysis runs on the API: the frontend imports only types from the core.',
            },
            {
              group: [
                '**/apps/api/**',
                '**/api/src/**',
                '**/packages/**',
                'fastify',
                '@fastify/*',
                'fasttext.wasm',
                'node:*',
              ],
              message:
                'The frontend reaches the backend over HTTP (src/api.ts) and never imports server code.',
            },
          ],
        },
      ],
    },
  },
  {
    // End-to-end tests treat the app as a black box: browser and HTTP only.
    files: ['e2e/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@charaicter/*', '**/apps/**', '**/packages/**'],
              message:
                'End-to-end tests drive the app through the browser; never import its code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/src/lib/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@charaicter/shared/*', 'react', 'react-dom'],
              allowTypeImports: true,
              message:
                'lib/ holds pure UI helpers: import only types from React and the core.',
            },
            {
              group: ['../components/*', '../App', '../api'],
              message: 'lib/ holds pure UI helpers: no components or requests.',
            },
          ],
        },
      ],
    },
  },
)
