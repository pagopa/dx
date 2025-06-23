import { Writer } from "../../domain/writer.js";

export const makeConsoleWriter = (): Writer => ({
  write: (message: string) => {
    console.log(message);
  },
});
