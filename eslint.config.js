// Linter del proyecto: solo errores reales (variables sin definir, claves repetidas, código inalcanzable...), no estilo (eso lo hace Prettier). Uso: npm run lint
const globals = require('globals');
module.exports = [
  { ignores: ['node_modules/**', 'dist/**', 'vendor/**', 'recursos/**', 'capturas/**', 'escritorio/**', 'calidad/**', 'datos_*.js', 'eslint.config.js'] },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: Object.assign({}, globals.browser, globals.node, { GM: 'writable', THREE: 'writable', LZString: 'readonly', global: 'writable' })
    },
    rules: {
      'no-undef': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-dupe-else-if': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',
      'no-const-assign': 'error',
      'no-func-assign': 'error',
      'no-self-assign': 'error',
      'no-unsafe-finally': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'no-redeclare': 'error',
      'no-shadow-restricted-names': 'error',
      'no-sparse-arrays': 'error',
      'no-unsafe-negation': 'error',
      'no-loss-of-precision': 'error',
      'no-empty-pattern': 'error',
      'no-compare-neg-zero': 'error'
    }
  },
  { files: ['tools/*.js', 'tools/*.mjs', 't_*.js', 'load.js', 'build.js', 'test_all.js', 'serve.js'], languageOptions: { sourceType: 'commonjs' } },
  { files: ['**/*.mjs', 'tools/three_entry.js'], languageOptions: { sourceType: 'module' } }
];
