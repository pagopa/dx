import { getLogger } from "@logtape/logtape";

import { Dependencies } from "./dependencies.js";

export interface InfoResult {
  packageManager: string; // restrict to 'pnpm', 'yarn' or 'npm'?
}

// TODO: Implement this. Just a placeholder for now.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getInfo = (dependencies: Dependencies): InfoResult => ({
  packageManager: "pnpm",
});

export const printInfo = (result: InfoResult): void => {
  const logger = getLogger(["dx-cli", "info"]);
  logger.info(JSON.stringify(result));
};
