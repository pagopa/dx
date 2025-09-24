import { errAsync, okAsync, ResultAsync } from "neverthrow";

import { CodemodRegistry } from "../domain/codemod.js";

export type ApplyCodemodById = (id: string) => ResultAsync<void, Error>;

export const applyCodemodById =
  (registry: CodemodRegistry): ApplyCodemodById =>
  (id) =>
    registry
      .getById(id)
      .andThen((codemod) =>
        codemod
          ? okAsync(codemod)
          : errAsync(new Error(`Codemod with id ${id} not found`)),
      )
      .andThen((codemod) => codemod.apply());
