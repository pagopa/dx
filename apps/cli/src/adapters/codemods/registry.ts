import { okAsync } from "neverthrow";

import { Codemod, CodemodRegistry } from "../../domain/codemod.js";

export class LocalCodemodRegistry implements CodemodRegistry {
  #m: Map<Codemod["id"], Codemod>;
  constructor() {
    this.#m = new Map<Codemod["id"], Codemod>();
  }
  add(codemod: Codemod) {
    this.#m.set(codemod.id, codemod);
  }
  getAll() {
    return okAsync(Array.from(this.#m.values()));
  }
  getById(id: string) {
    return okAsync(this.#m.get(id));
  }
}
