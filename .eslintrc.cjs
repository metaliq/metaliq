module.exports = {
  extends: "standard-with-typescript",
  parserOptions: {
    project: "./tsconfig.json"
  },
  // Add specific overrides to tweak StandardJS defaults to match our usage
  rules: {
    // We prefer double quoted strings ...
    quotes: [2, "double"],
    // Sometimes we `await` function calls that may or may not be asynchronous
    // This allows for agnostic handling in higher-order functions
    "no-return-await": 0,
    // Sometimes we instantiate a class referenced by variable
    // Again, allows for common class handling in higher-order functions
    "new-cap": 0,
    // We don't mind a blank line at the top of some blocks,
    // such as before the first method of a class
    "padded-blocks": "off",
    // ---- Additional rules for typescript
    "@typescript-eslint/quotes": [2, "double"],
    // Allow coercion to bool
    "@typescript-eslint/strict-boolean-expressions": "off",
    // Allow checking of bool === false, to allow for null
    "@typescript-eslint/no-unnecessary-boolean-literal-compare": "off",
    // Allow <Type> style casting
    "@typescript-eslint/consistent-type-assertions": "off",
    // Allow async methods without return type
    "@typescript-eslint/explicit-function-return-type": "off",
    // Do not force types to be delcared as interfaces
    "@typescript-eslint/consistent-type-definitions": "off",
    // Allow non-async functions with promise return
    "@typescript-eslint/promise-function-async": "off",
    // Alow template expressions to be built with non-string types
    "@typescript-eslint/restrict-template-expressions": "off",
    // Allow underscore formatted property names (common in the API for this project)
    "@typescript-eslint/naming-convention": "off",
    // Allow array sorts on values without compare function
    "@typescript-eslint/require-array-sort-compare": "off",
    // Alow use of empty classes, e.g. class-based discriminated unions
    "@typescript-eslint/no-extraneous-class": "off",
    // Prevent this check which reports obj[key].toString as being [object Object]
    "@typescript-eslint/no-base-to-string": "off",

    // Specifically turned off for SuperState, as we use namespaced interface merging to work around lack of HKTs
    "@typescript-eslint/no-namespace": "off"
  }
}
