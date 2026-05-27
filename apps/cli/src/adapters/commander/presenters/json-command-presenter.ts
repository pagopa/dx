/**
 * JsonCommandPresenter — structured adapter for the CommandPresenter domain port.
 *
 * Emits all output as NDJSON to stdout so agents can consume a single stream.
 * Each line is a self-describing JSON object discriminated by its fields:
 *
 *   {"type":"step","status":"start"|"success"|"error","name":"...","error":"...?"}
 *   {"ok":true,"data":{...}}
 *   {"ok":false,"error":"..."}
 */
import type { CommandPresenter } from "../../../domain/command-presenter.js";

import { toErrorMessage } from "../error-reporting.js";

export class JsonCommandPresenter implements CommandPresenter {
  reportError(error: unknown): void {
    process.stdout.write(
      JSON.stringify({ error: toErrorMessage(error), ok: false }) + "\n",
    );
  }

  reportResult<T>(data: T): void {
    process.stdout.write(JSON.stringify({ data, ok: true }) + "\n");
  }

  async trackStep<T>(name: string, task: () => Promise<T>): Promise<T> {
    process.stdout.write(
      JSON.stringify({ name, status: "start", type: "step" }) + "\n",
    );
    try {
      const result = await task();
      process.stdout.write(
        JSON.stringify({ name, status: "success", type: "step" }) + "\n",
      );
      return result;
    } catch (error) {
      process.stdout.write(
        JSON.stringify({
          error: toErrorMessage(error),
          name,
          status: "error",
          type: "step",
        }) + "\n",
      );
      throw error;
    }
  }
}
