import { getLogger } from "@logtape/logtape";

export interface VersionEnv {
  printVersion: () => void;
}

export const makeVersionEnv = (): VersionEnv => ({
  printVersion: () => {
    const logger = getLogger(["dx-cli", "version"]);
    logger.info(`dx CLI version: ${__CLI_VERSION__}`);
  },
});
