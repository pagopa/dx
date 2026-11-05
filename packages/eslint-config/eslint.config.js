import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import perfectionist from "eslint-plugin-perfectionist";

export default [
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
    },
  },
  js.configs.recommended,
  eslintConfigPrettier,
  perfectionist.configs["recommended-natural"],
];
