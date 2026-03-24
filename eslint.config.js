import eslintConfigPrettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import perfectionist from 'eslint-plugin-perfectionist';
import prettier from 'eslint-plugin-prettier';
import promise from 'eslint-plugin-promise';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import regexp from 'eslint-plugin-regexp';
import security from 'eslint-plugin-security';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import eslint from '@eslint/js';
import pluginQuery from '@tanstack/eslint-plugin-query';

const NODE_BUILTINS_RE =
  '^(assert|buffer|child_process|cluster|console|constants|crypto|dgram|dns|domain|events|fs|http|https|module|net|os|path|punycode|querystring|readline|repl|stream|string_decoder|sys|timers|tls|tty|url|util|vm|zlib|freelist|v8|process|async_hooks|http2|perf_hooks)(/.*|$)';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.svg',
      '**/.npmrc',
      '**/public/**',
      'package-lock.json',
      'k8s/**',
      'docs/**',
      'packages/server/src/db/migrations/**',
    ],
  },

  // ── Presets ──
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
  promise.configs['flat/recommended'],
  regexp.configs['flat/recommended'],
  sonarjs.configs.recommended,

  // ── Shared base for ALL TypeScript files ──
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,mts,cts}'],
    languageOptions: {
      globals: {
        ...globals.es2020,
      },
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        projectService: {
          allowDefaultProject: ['*.js', '*.mjs', 'eslint.config.js'],
          defaultProject: 'tsconfig.base.json',
        },
        sourceType: 'module',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      perfectionist,
      prettier,
      'simple-import-sort': simpleImportSort,
      unicorn,
    },
    rules: {
      // ── TypeScript strict ──
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/member-ordering': [
        'error',
        {
          classes: ['field', 'constructor', 'private-instance-method', 'public-instance-method'],
        },
      ],
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-base-to-string': 'warn',
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-dynamic-delete': 'warn',
      '@typescript-eslint/no-empty-function': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-floating-promises': ['error', { ignoreIIFE: true }],
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            arguments: false,
            attributes: false,
            properties: false,
          },
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-type-assertion': 'off',
      '@typescript-eslint/no-unused-expressions': ['error', { enforceForJSX: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/prefer-nullish-coalescing': ['warn', { ignorePrimitives: true }],
      '@typescript-eslint/prefer-readonly-parameter-types': 'off',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/restrict-plus-operands': 'warn',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowBoolean: true, allowNumber: true },
      ],
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',

      // ── Core ESLint (additions beyond recommended) ──
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
      'max-depth': ['warn', 5],
      'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-params': ['warn', 5],
      'no-await-in-loop': 'warn',
      'no-console': 'error',
      'no-void': ['error', { allowAsStatement: true }],

      // ── Perfectionist ──
      'perfectionist/sort-classes': [
        'error',
        {
          groups: [
            'static-property',
            'private-property',
            'property',
            'constructor',
            'static-method',
            'private-method',
            'method',
          ],
          order: 'asc',
          type: 'natural',
        },
      ],
      'perfectionist/sort-imports': 'off',
      'perfectionist/sort-named-imports': 'off',
      'perfectionist/sort-objects': ['error', { type: 'alphabetical' }],
      // ── Prettier ──
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      // ── Import sorting ──
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': [
        'warn',
        {
          groups: [
            [NODE_BUILTINS_RE],
            ['^\\w'],
            ['^@cnv-monitor/'],
            ['^@'],
            ['^\\u0000'],
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            ['^.+\\.s?css$'],
          ],
        },
      ],
      // ── SonarJS tuning ──
      'sonarjs/cognitive-complexity': ['warn', 25],
      'sonarjs/deprecation': 'off',
      'sonarjs/different-types-comparison': 'warn',
      'sonarjs/function-return-type': 'off',
      'sonarjs/no-alphabetical-sort': 'warn',
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/no-misleading-array-reverse': 'warn',
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/no-nested-functions': 'off',
      'sonarjs/no-nested-template-literals': 'off',
      'sonarjs/no-unknown-property': 'off',
      'sonarjs/no-unused-collection': 'warn',
      'sonarjs/no-unused-vars': 'off',
      'sonarjs/pseudo-random': 'off',
      'sonarjs/redundant-type-aliases': 'off',
      'sonarjs/slow-regex': 'warn',
      'sonarjs/sonar-no-unused-vars': 'off',
      'sonarjs/todo-tag': 'off',

      // ── Unicorn ──
      'unicorn/abbreviations': 'off',
      'unicorn/consistent-function-scoping': 'warn',
      'unicorn/filename-case': [
        'error',
        {
          cases: { camelCase: true, kebabCase: true, pascalCase: true },
          ignore: [/^AI[A-Z]/],
        },
      ],
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/no-array-for-each': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/no-null': 'off',
      'unicorn/no-useless-undefined': 'off',
      'unicorn/prefer-module': 'off',
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/prevent-abbreviations': 'off',

      'unicorn/switch-case-braces': ['error', 'avoid'],
    },
  },

  // ── React / Client-specific ──
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  {
    files: ['packages/client/**/*.{ts,tsx}'],
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    ...jsxA11y.flatConfigs.recommended,
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    plugins: {
      ...(pluginQuery.configs['flat/recommended'][0]?.plugins ?? {}),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      ...jsxA11y.flatConfigs.recommended.plugins,
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    rules: {
      ...(pluginQuery.configs['flat/recommended'][0]?.rules ?? {}),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      ...jsxA11y.flatConfigs.recommended.rules,
      '@tanstack/query/infinite-query-property-order': 'off',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
      'react/display-name': 'off',
      'react/jsx-boolean-value': 'error',
      'react/jsx-curly-brace-presence': ['error', { children: 'never', props: 'never' }],
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-useless-fragment': 'error',
      'react/jsx-sort-props': ['error', { callbacksLast: true, shorthandFirst: true }],
      'react/no-array-index-key': 'warn',
      'react/no-unstable-nested-components': 'error',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/self-closing-comp': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  // ── Server / Node.js-specific (security) ──
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  {
    files: ['packages/server/**/*.ts'],
    ...security.configs.recommended,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    plugins: {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      ...security.configs.recommended.plugins,
    },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    rules: {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      ...security.configs.recommended.rules,
      'security/detect-object-injection': 'off',
    },
  },

  // ── Monorepo boundaries ──
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      boundaries,
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: [
            { allow: [{ to: { type: 'shared' } }], from: { type: 'shared' } },
            {
              allow: [{ to: { type: 'server' } }, { to: { type: 'shared' } }],
              from: { type: 'server' },
            },
            {
              allow: [{ to: { type: 'client' } }, { to: { type: 'shared' } }],
              from: { type: 'client' },
            },
          ],
        },
      ],
    },
    settings: {
      'boundaries/elements': [
        { mode: 'full', pattern: 'packages/shared/src/**', type: 'shared' },
        { mode: 'full', pattern: 'packages/server/src/**', type: 'server' },
        { mode: 'full', pattern: 'packages/client/src/**', type: 'client' },
      ],
    },
  },

  // ── TypeORM entities ──
  {
    files: ['packages/server/src/db/entities/**/*.ts'],
    rules: {
      '@typescript-eslint/no-empty-function': 'off',
    },
  },

  // ── Test files ──
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      'max-lines-per-function': 'off',
      'sonarjs/no-hardcoded-credentials': 'off',
    },
  },

  // eslint-config-prettier must be last to disable conflicting formatting rules
  eslintConfigPrettier,
);
