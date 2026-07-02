import vitest from "@vitest/eslint-plugin";

import base, { TEST_FILES } from "./base.js";

export default [
  ...base,
  {
    files: TEST_FILES,
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
];
