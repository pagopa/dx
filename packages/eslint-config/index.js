import eslint from "@eslint/js";
import comments from "@eslint-community/eslint-plugin-eslint-comments";
import perfectionistNatural from "eslint-plugin-perfectionist/configs/recommended-natural";
import prettier from "eslint-plugin-prettier/recommended";
import vitest from "eslint-plugin-vitest";
import tseslint from "typescript-eslint";

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  comments.configs.recommended,
  prettier,
  perfectionistNatural,
  {
    files: ["tests/**", "__tests__/**"],
    rules: {
      ...vitest.configs.recommended,
      "prefer-called-with": ["error"],
      "prefer-equality-matcher": ["error"],
      "prefer-expect-resolves": ["error"],
      "prefer-spy-on": ["error"],
      "prefer-todo": ["error"],
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-expressions": ["error"],
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
];
