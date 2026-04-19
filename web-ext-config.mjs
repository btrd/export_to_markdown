export default {
  sourceDir: '.',
  artifactsDir: 'web-ext-artifacts',
  ignoreFiles: [
    'src/**',
    'node_modules/**',
    'coverage/**',
    'web-ext-artifacts/**',
    '*.xpi',
    '*.zip',
    'eslint.config.js',
    'vitest.config.js',
    'web-ext-config.js',
    '.gitignore',
    'README.md',
  ],
  build: {
    overwriteDest: true,
  },
  run: {
    firefox: 'firefox',
    startUrl: ['about:newtab'],
  },
};
