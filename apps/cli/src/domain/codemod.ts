import { ResultAsync } from "neverthrow";

export type Codemod = {
  apply: () => ResultAsync<void, Error>;
  description: string;
  id: string;
};

export type CodemodRegistry = {
  getAll: () => ResultAsync<Codemod[], Error>;
  getById: (id: string) => ResultAsync<Codemod | undefined, Error>;
};
