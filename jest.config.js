module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Unit tests only for now; detection logic has no native deps.
  testMatch: ['**/__tests__/**/*.test.ts'],
};
