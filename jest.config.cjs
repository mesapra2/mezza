/* eslint-env node */
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx'],
  
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ESNext',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  setupFiles: ['<rootDir>/jest.env.js'],
  
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  
  transformIgnorePatterns: [
    'node_modules/(?!(@supabase|axios)/)',
  ],
  
  verbose: true,
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
};