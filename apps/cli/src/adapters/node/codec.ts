import { z } from "zod/v4";

import { scriptSchema } from "../../domain/node.js";

const scriptsRecordSchema = z.record(z.string(), z.string()).optional();

/**
 * Schema for validating a package.json file.
 * It expects a `name` field and an optional `scripts` field,
 * which is a record of script names to their commands.
 */
export const packageJsonSchema = z.object({
  name: z.string().min(1),
  scripts: scriptsRecordSchema,
});

/**
 * Transform a record (if present) into an array of Script objects.
 * If the record is not present, it returns an empty array.
 */
export const scriptsArraySchema = scriptsRecordSchema.transform((obj) =>
  obj
    ? Object.entries(obj).map(([name, script]) =>
        scriptSchema.parse({ name, script }),
      )
    : [],
);
