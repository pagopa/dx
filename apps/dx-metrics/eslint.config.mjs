import lintRules from "@pagopa/eslint-config";
import nextVitals from "eslint-config-next/core-web-vitals";
import { defineConfig } from "eslint/config";

export default defineConfig(...nextVitals, ...lintRules);
