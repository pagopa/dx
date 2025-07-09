import { z } from "zod/v4";

const WorkspaceName = z.string().min(1).brand<"WorkspaceName">();

export const workspaceSchema = z.object({
  name: WorkspaceName,
  path: z.string(),
});

export type Workspace = z.infer<typeof workspaceSchema>;
