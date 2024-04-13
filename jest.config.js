module.exports = {
  roots: ['<rootDir>/src'],
  setupFiles: ['./jest.polyfills.js'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.har?$': './config/transformers/json-transformer.js',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(j|t)sx?$',
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
}
