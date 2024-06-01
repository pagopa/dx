import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import perfectionist from "eslint-plugin-perfectionist/configs/recommended-natural";

export default [
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
    },
  },
  js.configs.recommended,
  prettier,
  perfectionist,
];
