import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '**/*.json', 'eslint.config.js', 'vite.config.ts'],
  },
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      // The crypto core uses indexed access pervasively; non-null assertions are intentional
      // and paired with bounds-correct loops.
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
)
