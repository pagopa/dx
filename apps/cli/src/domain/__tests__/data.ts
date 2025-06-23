import { MockProxy, mock } from "vitest-mock-extended";

import { Dependencies } from "../dependencies.js";
import { Writer } from "../writer.js";

export const makeMockDependencies = (): MockProxy<Dependencies> => ({
  writer: mock<Writer>(),
});
