import lintRules from "@pagopa/eslint-config";
import nextVitals from "eslint-config-next/core-web-vitals";
import { defineConfig } from "eslint/config";

// pnpm resolves two separate instances of @typescript-eslint/eslint-plugin
// (one for eslint-config-next, one for @pagopa/eslint-config), causing ESLint
// to throw "Cannot redefine plugin". We normalise all configs to share the
// single plugin instance that nextVitals already registers.
const tsPlugin = nextVitals.find((c) => c.plugins?.["@typescript-eslint"])
  ?.plugins?.["@typescript-eslint"];

const normalizedLintRules = lintRules.map((rule) =>
  rule.plugins?.["@typescript-eslint"]
    ? { ...rule, plugins: { ...rule.plugins, "@typescript-eslint": tsPlugin } }
    : rule,
);

export default defineConfig(...nextVitals, ...normalizedLintRules);
