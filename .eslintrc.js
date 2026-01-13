module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['react', 'react-hooks', '@typescript-eslint'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        args: 'none',
        ignoreRestSiblings: true,
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-empty-object-type': 'off',
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+ JSX transform
    'react/no-unescaped-entities': 'off',
    'react/prop-types': 'off', // Using TypeScript for prop validation
    'prefer-const': 'warn',
  },
  ignorePatterns: [
    'dist/**/*',
    'node_modules/**/*',
    'build/**/*',
    'tmp/**/*',
    'src-tauri/target/**/*',
    'modal/**/*',
  ],
};
