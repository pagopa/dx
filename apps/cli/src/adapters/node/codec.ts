import { z } from "zod";

import { ScriptSchema } from "../../domain/node.js";

const ScriptsRecordSchema = z.record(z.string()).optional();

/**
 * Schema for validating a package.json file.
 * It expects a `name` field and an optional `scripts` field,
 * which is a record of script names to their commands.
 */
export const PackageJsonSchema = z.object({
  name: z.string().nonempty(),
  scripts: ScriptsRecordSchema,
});

/**
 * Transform a record (if present) into an array of Script objects.
 * If the record is not present, it returns an empty array.
 */
export const ScriptsArraySchema = ScriptsRecordSchema.transform((obj) =>
  obj
    ? Object.entries(obj).map(([name, script]) =>
        ScriptSchema.parse({ name, script }),
      )
    : [],
);
