import { okAsync } from "neverthrow";

import { Codemod } from "../../domain/codemod.js";

const apply = () => {
  // eslint-disable-next-line no-console
  console.log("Hello from example codemod!");
  return okAsync(void 0);
};

export default {
  apply,
  description: "An example codemod that does nothing",
  id: "example",
} satisfies Codemod;
