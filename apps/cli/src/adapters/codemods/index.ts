import example from "./example.js";
import { LocalCodemodRegistry } from "./registry.js";

const registry = new LocalCodemodRegistry();

registry.add(example);

export default registry;
