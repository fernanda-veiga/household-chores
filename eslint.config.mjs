import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**', 'test-results/**', 'playwright-report/**'] },
  ...tseslint.configs.recommended,
  { files: ['src/domain/**/*.ts'], rules: {
    'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'sessionStorage', 'indexedDB', 'fetch', 'process'],
    'no-restricted-properties': ['error', { object: 'Date', property: 'now', message: 'Inject time into domain operations.' }],
  } },
);
