module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['js', 'ts'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@actions/core$': '<rootDir>/__mocks__/actions-core.ts'
  },
  transform: {
    '^.+\\.ts$': 'ts-jest'
  }
}