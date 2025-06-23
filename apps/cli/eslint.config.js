import lintRules from "@pagopa/eslint-config";

export default [
  ...lintRules,
  {
    files: ["src/adapters/console/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
];
