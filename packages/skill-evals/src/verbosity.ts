/**
 * Local eval verbosity: 0 is CI-quiet, 1 is progress, 2 is conversation.
 *
 * The CLI parses -v, -vv, and --verbose=2 so domain code only sees a number.
 */
import { z } from "zod";

export const verbositySchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
]);

export type Verbosity = z.infer<typeof verbositySchema>;

const assignedLevel = /^(?:-v|--verbose)=(.*)$/;

const parseAssignedLevel = (value: string): Verbosity => {
  const parsed = verbositySchema.safeParse(Number(value));
  if (!parsed.success) {
    throw new Error("verbosity must be 0, 1, or 2");
  }
  return parsed.data;
};

/** Reads -v, -vv, --verbose, and --verbose=2 from raw CLI arguments. */
export const parseCliVerbosity = (argv: readonly string[]): Verbosity => {
  let level: Verbosity = 0;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      return level;
    }
    if (arg === "-vv" || arg === "-vvv") {
      level = 2;
      continue;
    }
    if (arg === "-v" || arg === "--verbose") {
      const next = argv[index + 1];
      if (next !== undefined && /^[012]$/.test(next)) {
        level = parseAssignedLevel(next);
        index += 1;
        continue;
      }
      level = verbositySchema.parse(Math.min(2, level + 1));
      continue;
    }
    const matched = assignedLevel.exec(arg ?? "");
    if (matched?.[1] !== undefined) {
      level = parseAssignedLevel(matched[1]);
    }
  }

  return level;
};
