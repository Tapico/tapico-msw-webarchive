module.exports = {
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.har?$': './config/transformers/json-transformer.js',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(j|t)sx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
}
