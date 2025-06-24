import { Logger } from "../../domain/logger.js";

export const makeConsoleLogger = (): Logger => ({
  write: (message: string) => {
    console.log(message);
  },
});
