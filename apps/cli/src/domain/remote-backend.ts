import { z } from "zod/v4";

export const terraformBackendSchema = z.discriminatedUnion("type", [
  z.object({
    resourceGroupName: z.string().min(1),
    storageAccountName: z.string().min(1),
    subscriptionId: z.string().min(1),
    type: z.literal("azurerm"),
  }),
]);

export type TerraformBackend = z.infer<typeof terraformBackendSchema>;
