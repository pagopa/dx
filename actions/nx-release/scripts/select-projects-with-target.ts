/**
 * Selects Nx projects that expose a requested target for the release workflow.
 *
 * The workflow passes an optional CSV of versioned projects and this script
 * intersects it with Nx's authoritative JSON target query before emitting CSV.
 */
import { z } from "zod";

import { getNxProjectNames } from "./shared.js";

const TargetSchema = z.string().min(1);

const ProjectCsvSchema = z
  .string()
  .transform((value) => value.split(",").map((project) => project.trim()))
  .pipe(z.array(z.string().min(1)).min(1));

const SelectionInputSchema = z.object({
  projects: ProjectCsvSchema.optional(),
  target: TargetSchema,
});

export interface SelectionInput {
  readonly projects?: string[];
  readonly target: TargetName;
}

export type TargetName = z.infer<typeof TargetSchema>;

/** Validates workflow environment variables used to select release targets. */
export function parseSelectionInput(environment: unknown): SelectionInput {
  const parsed = SelectionInputSchema.safeParse(environment);
  if (!parsed.success) {
    throw new Error(
      `Invalid target selection input: ${parsed.error.issues
        .map((issue) => issue.message)
        .join(", ")}`,
    );
  }

  return {
    projects: parsed.data.projects,
    target: parsed.data.target,
  };
}

/** Intersects target-enabled projects with the optional versioned project set. */
export function selectProjectsWithTarget(
  projectsWithTarget: string[],
  requestedProjects?: string[],
): string[] {
  if (!requestedProjects) {
    return projectsWithTarget;
  }

  return [
    ...new Set(projectsWithTarget).intersection(new Set(requestedProjects)),
  ];
}

/** Main entrypoint: queries Nx and emits the selected projects as CSV. */
async function run(): Promise<void> {
  const { projects, target } = parseSelectionInput({
    projects: process.env.projects,
    target: process.env.target,
  });
  const projectsWithTarget = await getNxProjectNames(target);
  const selectedProjects = selectProjectsWithTarget(
    projectsWithTarget,
    projects,
  );

  console.error(
    `Projects with ${target}: ${selectedProjects.join(",") || "(none)"}`,
  );
  process.stdout.write(selectedProjects.join(","));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err: unknown) => {
    console.error("Unexpected error in select-projects-with-target:", err);
    process.exit(1);
  });
}
