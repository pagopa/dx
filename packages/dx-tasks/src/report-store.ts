/** This module stores and renders dx-tasks reports under a per-namespace directory tree. */

import fs from "node:fs/promises";
import path from "node:path";
import * as z from "zod/mini";

const nonEmptyStringSchema = z.string().check(z.minLength(1));

export type ReportFormat = "markdown";

export interface ReportNamespace<
  TSchema extends z.ZodMiniType = z.ZodMiniType,
> {
  name: string;
  renderers?: Partial<Record<ReportFormat, ReportRenderFn<TSchema>>>;
  schema: TSchema;
}

export type ReportRenderFn<TSchema extends z.ZodMiniType> = (
  reports: readonly z.output<TSchema>[],
) => string;

const readReports = async (
  directoryPath: string,
): Promise<readonly unknown[]> => {
  let entries: string[];

  try {
    entries = await fs.readdir(directoryPath);
  } catch (cause) {
    if (
      cause instanceof Error &&
      (cause as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return [];
    }

    throw new Error(`Failed to read report directory "${directoryPath}"`, {
      cause,
    });
  }

  return Promise.all(
    entries
      .filter((entry) => entry.endsWith(".json"))
      .sort((a, b) => a.localeCompare(b))
      .map(async (fileName) => {
        const filePath = path.join(directoryPath, fileName);

        try {
          return JSON.parse(await fs.readFile(filePath, "utf8"));
        } catch (cause) {
          throw new Error(`Failed to read report file "${filePath}"`, {
            cause,
          });
        }
      }),
  );
};

export class ReportStore {
  private readonly namespaces = new Map<string, ReportNamespace>();
  private readonly rootDirectoryPath: string;

  constructor(baseDirectoryPath = process.cwd()) {
    this.rootDirectoryPath = path.join(baseDirectoryPath, ".dx-tasks");
  }

  register<TSchema extends z.ZodMiniType>(
    namespace: ReportNamespace<TSchema>,
  ): this {
    const name = nonEmptyStringSchema.parse(namespace.name);

    if (this.namespaces.has(name)) {
      throw new Error(`Report namespace "${name}" is already registered`);
    }

    this.namespaces.set(name, namespace as ReportNamespace);

    return this;
  }

  async render(format: ReportFormat = "markdown"): Promise<string> {
    const sections: string[] = [];

    for (const namespace of this.namespaces.values()) {
      const renderReports = namespace.renderers?.[format];

      if (!renderReports) {
        continue;
      }

      const directoryPath = path.join(this.rootDirectoryPath, namespace.name);
      const reports = (await readReports(directoryPath)).map((report) =>
        namespace.schema.parse(report),
      );

      if (reports.length === 0) {
        continue;
      }

      sections.push(renderReports(reports));
    }

    return sections.join("\n\n");
  }

  async write(
    namespaceName: string,
    objectName: string,
    content: unknown,
  ): Promise<void> {
    const name = nonEmptyStringSchema.parse(namespaceName);
    const namespace = this.namespaces.get(name);

    if (!namespace) {
      throw new Error(`Report namespace "${name}" is not registered`);
    }

    const report = namespace.schema.parse(content);
    const directoryPath = path.join(this.rootDirectoryPath, name);
    const filePath = path.join(
      directoryPath,
      `${nonEmptyStringSchema.parse(objectName)}.json`,
    );

    try {
      await fs.mkdir(directoryPath, { recursive: true });
    } catch (cause) {
      throw new Error(
        `Failed to create reporter namespace directory "${directoryPath}"`,
        { cause },
      );
    }

    try {
      await fs.writeFile(filePath, JSON.stringify(report, null, 2), "utf8");
    } catch (cause) {
      throw new Error(`Failed to write reporter file "${filePath}"`, { cause });
    }
  }
}
