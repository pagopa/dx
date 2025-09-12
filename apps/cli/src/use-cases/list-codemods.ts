import { ResultAsync } from "neverthrow";

import { Codemod, CodemodRegistry } from "../domain/codemod.js";

export type ListCodemods = () => ResultAsync<Codemod[], Error>;

export const listCodemods =
  (registry: CodemodRegistry): ListCodemods =>
  () =>
    registry.getAll();
