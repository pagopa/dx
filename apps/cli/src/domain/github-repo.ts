import { z } from "zod/v4";

export const githubRepoSchema = z.object({
  owner: z.string().min(1),
  ownerId: z.number().int().positive().optional(),
  repo: z
    .string()
    .min(1)
    .transform((repo) => repo.replace(/\.git$/, "")),
  repoId: z.number().int().positive().optional(),
});

export type GitHubRepo = z.infer<typeof githubRepoSchema>;
