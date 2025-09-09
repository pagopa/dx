import { Codemod } from "../../domain/codemod.js";

const apply = async () => {
  // eslint-disable-next-line no-console
  console.log("Hello from example codemod!");
  return undefined;
};

export default {
  apply,
  description: "An example codemod that does nothing",
  id: "example",
} satisfies Codemod;
