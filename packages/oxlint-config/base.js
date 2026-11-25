import baseVariant from "./base.json" with { type: "json" };
import { compose } from "./compose.js";

/** @type {import("oxlint").OxlintConfig} */
export default compose(baseVariant);
