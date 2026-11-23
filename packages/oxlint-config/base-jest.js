import baseJestVariant from "./base-jest.json" with { type: "json" };
import { flatten } from "./flatten.js";

/** @type {import("oxlint").OxlintConfig} */
export default flatten(baseJestVariant);
