// Jest config لمحركات الألعاب فقط (خادم — بدون تبعيات React Native)
// يتجاهل babel.config.js الخاص بالتطبيق (preset-expo) ويحوّل TypeScript مباشرة.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/server/**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
        configFile: false,
        babelrc: false,
      },
    ],
  },
  roots: ['<rootDir>/src/server'],
  testPathIgnorePatterns: ['/\\._', '__MACOSX'],
  moduleFileExtensions: ['ts', 'js', 'json'],
};
