import js from "@eslint/js";
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import prettier from "eslint-config-prettier";
import perfectionist from "eslint-plugin-perfectionist/configs/recommended-natural";
import vitest from "eslint-plugin-vitest";
import ts from "typescript-eslint";

export default [
  js.configs.recommended,
  ...ts.configs.strict,
  ...ts.configs.stylistic,
  prettier,
  perfectionist,
  comments.configs.recommended,
  {
    ...vitest.configs.recommended,
    rules: {
      ...vitest.configs.recommended.rules,
      "prefer-called-with": ["error"],
      "prefer-equality-matcher": ["error"],
      "prefer-expect-resolves": ["error"],
      "prefer-spy-on": ["error"],
      "prefer-todo": ["error"],
    },
  },
];
