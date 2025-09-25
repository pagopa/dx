import example from "./example.js";
import { LocalCodemodRegistry } from "./registry.js";
import { updateCodeReview } from "./update-code-review.js";
import { useAzureAppsvc } from "./use-azure-appsvc.js";
import usePnpm from "./use-pnpm.js";

const registry = new LocalCodemodRegistry();

registry.add(example);
registry.add(usePnpm);
registry.add(useAzureAppsvc);
registry.add(updateCodeReview);

export default registry;
