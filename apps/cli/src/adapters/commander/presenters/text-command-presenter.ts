/**
 * TextCommandPresenter — human-readable adapter for the CommandPresenter domain port.
 *
 * Renders step progress via oraPromise for interactive terminal feedback,
 * and writes results and errors to the console with chalk colouring.
 * Intended for interactive terminal sessions (TTY).
 */
import chalk from "chalk";
import { oraPromise } from "ora";

import type { CommandPresenter } from "../../../domain/command-presenter.js";

import { toErrorMessage } from "../error-reporting.js";

export class TextCommandPresenter implements CommandPresenter {
  reportError(error: unknown): void {
    console.error(chalk.red(toErrorMessage(error)));
  }

  reportResult<T>(data: T): void {
    if (Array.isArray(data)) {
      console.table(data);
    } else {
      console.log(data);
    }
  }

  async trackStep<T>(name: string, task: () => Promise<T>): Promise<T> {
    return oraPromise(task(), { text: name });
  }
}
