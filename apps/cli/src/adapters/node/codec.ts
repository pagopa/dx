import { z } from "zod/v4";

import { dependencySchema, scriptSchema } from "../../domain/package-json.js";

const scriptsRecordSchema = z.record(z.string(), z.string()).optional();

const dependenciesRecordSchema = z.record(z.string(), z.string()).optional();

export const packageJsonSchema = z.object({
  dependencies: dependenciesRecordSchema,
  devDependencies: dependenciesRecordSchema,
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

/**
 * Transform a dependencies object (if present) into an array of Dependency objects.
 * If the record is not present, it returns an empty array.
 */
export const dependenciesArraySchema = dependenciesRecordSchema.transform(
  (obj) =>
    obj
      ? Object.entries(obj).map(([name, version]) =>
          dependencySchema.parse({ name, version }),
        )
      : [],
);

export type PackageJson = z.infer<typeof packageJsonSchema>;
