import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import perfectionist from "eslint-plugin-perfectionist";

export default [
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
    },
  },
  js.configs.recommended,
  prettier,
  perfectionist.configs["recommended-natural"],
];
