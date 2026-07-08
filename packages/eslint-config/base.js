import eslint from "@eslint/js";
import perfectionist from "eslint-plugin-perfectionist";
import prettier from "eslint-plugin-prettier/recommended";
import tseslint from "typescript-eslint";

export const TEST_FILES = [
  "**/tests/**/*.{js,ts}",
  "**/__tests__/**/*.{js,ts}",
  "**/*.{test,spec}.{js,ts}",
];

export default [
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  prettier,
  perfectionist.configs["recommended-natural"],
  {
    rules: {
      "@typescript-eslint/no-unused-expressions": "error",
      "@typescript-eslint/no-unused-vars": ["error", { args: "after-used" }],
      "arrow-body-style": "error",
      complexity: "error",
      eqeqeq: ["error", "smart"],
      "guard-for-in": "error",
      "max-lines-per-function": ["error", 200],
      "no-bitwise": "error",
      "no-eval": "error",
      "no-new-wrappers": "error",
      "no-param-reassign": "error",
      "no-undef-init": "error",
      "no-var": "error",
      "prefer-const": "error",
      radix: "error",
    },
  },
  {
    ignores: ["**/generated/*", "**/dist/**", "**/bin/**"],
  },
];
