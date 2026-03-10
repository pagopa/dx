import nextVitals from "eslint-config-next/core-web-vitals";
import lintRules from "@pagopa/eslint-config";

const eslintConfig = [...nextVitals, ...lintRules];

export default eslintConfig;
