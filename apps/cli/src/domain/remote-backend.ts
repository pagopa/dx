import { z } from "zod/v4";

export const terraformBackendSchema = z.discriminatedUnion("type", [
  z.object({
    containerName: z.string().min(1),
    resourceGroupName: z.string().min(1),
    storageAccountName: z.string().min(1),
    subscriptionId: z.string().min(1),
    type: z.literal("azurerm"),
  }),
]);

export type TerraformBackend = z.infer<typeof terraformBackendSchema>;

const stateContainerDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(15)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const terraformStateContainerName = (domain: string): string =>
  `${stateContainerDomainSchema.parse(domain)}-tf-state`;
