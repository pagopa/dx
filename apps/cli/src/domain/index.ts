import { Dependencies } from "./dependencies.js";

export const unwrapOrLogError =
  ({ logger }: Pick<Dependencies, "logger">) =>
  async <T>(fn: () => Promise<T>) => {
    try {
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error(message);
      throw error;
    }
  };
