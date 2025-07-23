import eslint from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import perfectionist from "eslint-plugin-perfectionist";
import prettier from "eslint-plugin-prettier/recommended";
import tseslint from "typescript-eslint";

export default [
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  prettier,
  perfectionist.configs["recommended-natural"],
  {
    files: ["**/tests/**", "**/__tests__/**"],
    ...vitest.configs.recommended,
    rules: {
      ...vitest.configs.recommended.rules,
      "@typescript-eslint/no-empty-function": "off",
      "vitest/prefer-called-with": "error",
      "vitest/prefer-equality-matcher": "error",
      "vitest/prefer-expect-resolves": "error",
      "vitest/prefer-spy-on": "error",
      "vitest/prefer-todo": "error",
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
  },
];
