/**
 * @see https://prettier.io/docs/en/configuration.html
 * @type {import("prettier").Config}
 */
const config = {
  trailingComma: "es5",
  semi: false,
  singleQuote: true,
  printWidth: 90,
  plugins: [
    "@trivago/prettier-plugin-sort-imports",
  ],
  importOrder: [
    "<THIRD_PARTY_MODULES>",
    "^~/(.*)$",
    "^[./]",
  ],
  importOrderTypeScriptVersion: "4.4.0",
  importOrderSeparation: false,
  importOrderSortSpecifiers: true,
};

export default config;
