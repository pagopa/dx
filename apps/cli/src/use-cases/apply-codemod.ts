import { errAsync, okAsync, ResultAsync } from "neverthrow";

import { Codemod, CodemodRegistry } from "../domain/codemod.js";
import { GetInfo } from "../domain/info.js";

export type ApplyCodemodById = (id: string) => ResultAsync<void, Error>;

const getCodemodById = (
  registry: CodemodRegistry,
  id: string,
): ResultAsync<Codemod, Error> =>
  registry
    .getById(id)
    .andThen((codemod) =>
      codemod
        ? okAsync(codemod)
        : errAsync(new Error(`Codemod with id ${id} not found`)),
    );

const safeGetInfo = (getInfo: GetInfo): ResultAsync<unknown, Error> =>
  ResultAsync.fromPromise(
    getInfo(),
    (error) => new Error("Failed to get info", { cause: error }),
  );

export const applyCodemodById =
  (registry: CodemodRegistry, getInfo: GetInfo): ApplyCodemodById =>
  (id) =>
    ResultAsync.combine([
      safeGetInfo(getInfo),
      getCodemodById(registry, id),
    ]).andThen(([info, codemod]) =>
      ResultAsync.fromPromise(codemod.apply(info), (error) => {
        const message = error instanceof Error ? `: ${error.message}` : "";
        return new Error("Failed to apply codemod" + message, { cause: error });
      }),
    );
