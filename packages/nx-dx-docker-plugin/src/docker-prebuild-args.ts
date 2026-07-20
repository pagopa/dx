// Validates and expands the optional Docker release project filter before it
// reaches the Nx child process command line.
import { z } from "zod/v4";

const projectsFilterSchema = z
  .string()
  .min(1)
  .regex(
    /^[A-Za-z0-9@][A-Za-z0-9@/_.,\s*-]*$/,
    "must be a comma/space-separated list of project names or patterns",
  );

export const parseDockerProjectsFilter = (
  rawProjectsFilter: string,
): readonly string[] =>
  projectsFilterSchema
    .parse(rawProjectsFilter)
    .split(/[,\s]+/)
    .filter(Boolean);
