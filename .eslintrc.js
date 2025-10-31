module.exports = {
  root: true,
  extends: [
    '@react-native',
    'plugin:import/recommended',
    'plugin:import/react',
  ],
  plugins: ['import', 'react', 'react-native', 'react-hooks'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.json', '.native.js'],
        moduleDirectory: ['node_modules', 'components', 'assets', '.'],
      },
      'react-native': {
        platform: 'native',
      },
    },
    'import/ignore': [
      'react-native',
      'react-native-calendars',
      '@react-native-community',
      '@react-navigation',
      'expo',
      '@env', // Handled by babel-plugin-react-native-dotenv
    ],
  },
  rules: {
    // Import validation rules
    'import/no-unresolved': [
      'error',
      {
        commonjs: true,
        caseSensitive: true,
        ignore: ['^react', '^react-native', '^@react', '^@react-native', '^@env'],
      },
    ],
    'import/named': 'error',
    'import/default': 'error',
    'import/namespace': 'error',
    'import/no-absolute-path': 'error',
    'import/no-dynamic-require': 'warn',
    'import/no-internal-modules': 'off',
    'import/no-relative-packages': 'off',
    'import/no-relative-parent-imports': 'off',
    
    // Relative import path validation - disabled for now (can be enabled if needed)
    // This rule was causing false positives with our nested folder structure
    'import/no-restricted-paths': 'off',
    
    // Import ordering and organization - disabled to allow flexible import formatting
    'import/order': 'off',
    
    // Prevent missing file extensions (optional, can be strict)
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        json: 'always',
      },
    ],
    
    // Ensure imports exist
    'import/no-missing-import': 'off', // Covered by no-unresolved
    
    // Prevent duplicate imports
    'import/no-duplicates': 'error',
    
    // Prevent unused imports
    'import/no-unused-modules': 'off', // Can be slow
    
    // React and React Native specific rules
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react-native/no-unused-styles': 'off', // Disabled - styles may be used conditionally or in future
    'react-native/no-color-literals': 'off',
    'react-native/no-inline-styles': 'off',
    'react-native/no-raw-text': 'off',
    
    // React Hooks
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // General JavaScript best practices
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
  },
  env: {
    'react-native/react-native': true,
    es6: true,
    node: true,
  },
};

