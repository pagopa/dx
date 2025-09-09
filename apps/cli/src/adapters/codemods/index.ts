import example from "./example.js";
import { LocalCodemodRegistry } from "./registry.js";
import usePnpm from "./use-pnpm.js";

const registry = new LocalCodemodRegistry();

registry.add(example);
registry.add(usePnpm);

export default registry;
