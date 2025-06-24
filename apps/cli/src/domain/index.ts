import { Dependencies } from "./dependencies.js";

export const unwrapOrLogError =
  ({ writer }: Dependencies) =>
  async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      writer.write(`❌ ${message}`);
      throw error;
    }
  };
