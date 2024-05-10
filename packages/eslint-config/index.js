import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier/recommended";
import comments from "@eslint-community/eslint-plugin-eslint-comments";
import vitest from "eslint-plugin-vitest";
import perfectionistNatural from "eslint-plugin-perfectionist/configs/recommended-natural";

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
      "max-lines-per-function": ["error", 200],
      "arrow-body-style": "error",
      complexity: "error",
      "guard-for-in": "error",
      eqeqeq: ["error", "smart"],
      "no-bitwise": "error",
      "no-eval": "error",
      "no-console": "error",
      "no-new-wrappers": "error",
      "no-undef-init": "error",
      "no-param-reassign": "error",
      "no-var": "error",
      "prefer-const": "error",
      radix: "error",
      "@typescript-eslint/no-unused-expressions": ["error"],
      "@typescript-eslint/no-unused-vars": ["error", { args: "after-used" }],
    },
  },
];
