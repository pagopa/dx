import lintRules from "@pagopa/eslint-config";

export default [
  ...lintRules,
  {
    ignores: [
      "build/**",
      "static/**",
      "blog/**",
      ".docusaurus/**",
      "babel.config.js",
    ],
  },
];
