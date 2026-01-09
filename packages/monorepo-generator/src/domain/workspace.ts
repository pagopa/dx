import { z } from "zod/v4";

export const workspaceSchema = z.object({
  domain: z.string().default(""),
});

export type Workspace = z.infer<typeof workspaceSchema>;
