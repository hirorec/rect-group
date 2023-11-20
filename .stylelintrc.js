module.exports = {
  plugins: [
    'stylelint-prettier',
  ],
  extends: [
    'stylelint-prettier/recommended',
    'stylelint-config-prettier',
    'stylelint-config-property-sort-order-smacss'
  ],
  ignoreFiles: [
    '**/node_modules/**',
  ],
};