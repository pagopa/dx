import { z } from "zod/v4";

export const githubRepoSchema = z.object({
  owner: z.string().min(1),
  repo: z
    .string()
    .min(1)
    .transform((repo) => repo.replace(/\.git$/, "")),
});

export type GitHubRepo = z.infer<typeof githubRepoSchema>;
