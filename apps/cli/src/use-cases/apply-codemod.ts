import { errAsync, okAsync, ResultAsync } from "neverthrow";

import { CodemodRegistry } from "../domain/codemod.js";

export type ApplyCodemod = (id: string) => ResultAsync<void, Error>;

export const applyCodemod =
  (registry: CodemodRegistry): ApplyCodemod =>
  (id: string) =>
    registry
      .getById(id)
      .andThen((codemod) =>
        codemod
          ? okAsync(codemod)
          : errAsync(new Error(`Codemod with id ${id} not found`)),
      )
      .andThen((codemod) => codemod.apply());
