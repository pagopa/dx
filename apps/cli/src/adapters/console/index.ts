import { Writer } from "../../domain/writer.js";

export const makeConsoleWriter = (): Writer => ({
  write: (message: string): void => {
    console.log(message);
  },
});
