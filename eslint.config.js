const eslint = require('@eslint/js');

module.exports = [
  eslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        node: true,
        console: true,
        process: true,
        __dirname: true,
        module: true,
        require: true,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'off',
    },
  },
];
