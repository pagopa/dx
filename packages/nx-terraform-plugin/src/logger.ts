/**
 * Category helpers for the nx-terraform-plugin LogTape logger tree.
 */

import { getLogger, type Logger } from "@logtape/logtape";

export const getPackageLogger = (category: string[]): Logger =>
  getLogger(["nx-terraform-plugin", ...category]);
