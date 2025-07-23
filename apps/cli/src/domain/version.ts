import { getLogger } from "@logtape/logtape";

export function printVersion(): void {
  const logger = getLogger(["dx-cli", "version"]);
  logger.info(`dx CLI version: ${__CLI_VERSION__}`);
}
