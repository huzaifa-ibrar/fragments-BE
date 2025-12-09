module.exports = {
  testEnvironment: 'node',

  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js'],

  coverageDirectory: 'coverage',

  coverageThreshold: {
    global: {
      branches: 60,
      functions: 75,
      lines: 69,
      statements: 69,
    },
  },

  // Force exit after all tests finish to avoid hanging
  forceExit: true,

  // Wait for all async operations to complete
  detectOpenHandles: false,

  // Timeout for tests
  testTimeout: 10000,
};
