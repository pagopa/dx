import { Logger } from "../../domain/logger.js";

export const makeConsoleLogger = (): Logger => ({
  error: (message: string) => {
    console.error(`❌ ${message}`);
  },
  log: console.log,
  success: (message: string) => {
    console.log(`✅ ${message}`);
  },
});
