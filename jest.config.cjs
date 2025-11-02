/* eslint-env node */
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx'],
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', {
      useESM: true,
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  // Adicione estas linhas:
  globals: {
    'import.meta': {
      env: {
        VITE_SUPABASE_URL: 'https://ksmnfhenhppasfcikefd.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'your-test-anon-key',
        // adicione outras variáveis de ambiente que você usa
      },
    },
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@supabase)/)',
  ],
};