/**
 * TextOutputLogger — human-readable adapter for the OutputLogger domain port.
 *
 * Renders step progress via oraPromise for interactive terminal feedback,
 * and writes results and errors to the console with chalk colouring.
 * Intended for interactive terminal sessions (TTY).
 */
import chalk from "chalk";
import { oraPromise } from "ora";

import type { OutputLogger } from "../../../domain/output-logger.js";

import { toErrorMessage } from "../error-reporting.js";

export class TextOutputLogger implements OutputLogger {
  reportError(error: unknown): void {
    console.error(chalk.red(toErrorMessage(error)));
  }

  reportResult<T>(data: T): void {
    console.log(data);
  }

  async runStep<T>(name: string, task: () => Promise<T>): Promise<T> {
    return oraPromise(task(), { text: name });
  }
}
