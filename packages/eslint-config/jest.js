import jest from "eslint-plugin-jest";

import base, { TEST_FILES } from "./base.js";

export default [
  ...base,
  {
    files: TEST_FILES,
    ...jest.configs["flat/recommended"],
    rules: {
      ...jest.configs["flat/recommended"].rules,
      "@typescript-eslint/no-empty-function": "off",
      "jest/prefer-called-with": "error",
      "jest/prefer-equality-matcher": "error",
      "jest/prefer-expect-resolves": "error",
      "jest/prefer-spy-on": "error",
      "jest/prefer-todo": "error",
    },
  },
];
