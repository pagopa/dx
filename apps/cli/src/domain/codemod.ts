import { ResultAsync } from "neverthrow";

import { InfoResult } from "./info.js";

export type Codemod = {
  apply: (info: InfoResult) => Promise<void>;
  description: string;
  id: string;
};

export type CodemodRegistry = {
  getAll: () => ResultAsync<Codemod[], Error>;
  getById: (id: string) => ResultAsync<Codemod | undefined, Error>;
};
