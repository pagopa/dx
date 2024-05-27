import eslint from "@eslint/js";
import perfectionistNatural from "eslint-plugin-perfectionist/configs/recommended-natural";
import prettier from "eslint-plugin-prettier/recommended";
import vitest from "eslint-plugin-vitest";
import tseslint from "typescript-eslint";

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  prettier,
  perfectionistNatural,
  {
    files: ["**/tests/**", "**/__tests__/**"],
    ...vitest.configs.recommended,
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/prefer-called-with": "error",
      "vitest/prefer-equality-matcher": "error",
      "vitest/prefer-expect-resolves": "error",
      "vitest/prefer-spy-on": "error",
      "vitest/prefer-todo": "error",
      "@typescript-eslint/no-empty-function": "off"
    },
  },
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
      "no-console": "error",
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
    ignores: ["**/generated/*"],
  }
];
