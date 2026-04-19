import js from '@eslint/js';
import jsonc from 'eslint-plugin-jsonc';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        browser: 'readonly', // WebExtension browser API
      },
    },
    rules: {
      'no-unused-vars': 'error',
      'no-console': 'warn',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always'],
    },
  },
  {
    files: ['src/__tests__/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        browser: 'readonly',
      },
    },
  },
  ...jsonc.configs['flat/recommended-with-json'],
  {
    files: ['**/*.json'],
    rules: {
      'jsonc/sort-keys': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/'],
  },
];
