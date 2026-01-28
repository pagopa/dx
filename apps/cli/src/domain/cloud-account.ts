import { z } from "zod/v4";

import { type EnvironmentId } from "./environment.js";
import { TerraformBackend } from "./remote-backend.js";

export const cloudAccountSchema = z.object({
  csp: z.enum(["azure"]).default("azure"),
  defaultLocation: z.string(),
  displayName: z.string().min(1),
  id: z.string().min(1),
});

export type CloudAccount = z.infer<typeof cloudAccountSchema>;

export type CloudAccountRepository = {
  list(): Promise<CloudAccount[]>;
};

export type CloudAccountService = {
  getTerraformBackend(
    cloudAccountId: CloudAccount["id"],
    environment: EnvironmentId,
  ): Promise<TerraformBackend | undefined>;

  hasUserPermissionToInitialize(
    cloudAccountId: CloudAccount["id"],
  ): Promise<boolean>;

  initialize(
    cloudAccount: CloudAccount,
    environment: EnvironmentId,
    tags?: Record<string, string>,
  ): Promise<void>;

  isInitialized(
    cloudAccountId: CloudAccount["id"],
    environment: EnvironmentId,
  ): Promise<boolean>;

  provisionTerraformBackend(
    cloudAccount: CloudAccount,
    environment: EnvironmentId,
    tags?: Record<string, string>,
  ): Promise<TerraformBackend>;
};

export const cloudRegionSchema = z.object({
  displayName: z.string().min(1),
  name: z.string().min(1),
  short: z.string().min(1).toLowerCase(),
});

export type CloudRegion = z.infer<typeof cloudRegionSchema>;
