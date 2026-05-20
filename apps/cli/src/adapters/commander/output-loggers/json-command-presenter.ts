/**
 * JsonCommandPresenter — structured adapter for the CommandPresenter domain port.
 *
 * Emits NDJSON step events to stderr for progress tracking and a single
 * JSON envelope to stdout for the final result or error. Intended for
 * automated pipelines and coding agents that parse structured output.
 *
 * Wire format:
 *   stderr: {"type":"step","status":"start"|"success"|"error","name":"...","error":"...?"}
 *   stdout: {"ok":true,"data":{...}} | {"ok":false,"error":"..."}
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
    process.stderr.write(
      JSON.stringify({ name, status: "start", type: "step" }) + "\n",
    );
    try {
      const result = await task();
      process.stderr.write(
        JSON.stringify({ name, status: "success", type: "step" }) + "\n",
      );
      return result;
    } catch (error) {
      process.stderr.write(
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
