/** This module persists validated dx-tasks reports as JSON artifacts. */

import fs from "node:fs/promises";
import path from "node:path";
import * as z from "zod/mini";

const nonEmptyStringSchema = z.string().check(z.minLength(1));

export interface ReporterNamespace<TSchema extends z.ZodMiniType> {
  write: (objectName: string, reportContent: z.input<TSchema>) => Promise<void>;
}

const createReportDirectory = async (
  reportsDirectoryPath: string,
): Promise<void> => {
  try {
    await fs.mkdir(reportsDirectoryPath, { recursive: true });
  } catch (cause) {
    throw new Error(
      `Failed to create reporter namespace directory "${reportsDirectoryPath}"`,
      { cause },
    );
  }
};

const writeReportFile = async (
  reportFilePath: string,
  serializedReport: string,
): Promise<void> => {
  try {
    await fs.writeFile(reportFilePath, serializedReport, "utf8");
  } catch (cause) {
    throw new Error(`Failed to write reporter file "${reportFilePath}"`, {
      cause,
    });
  }
};

export class Reporter {
  private readonly registeredNamespaces = new Set<string>();
  private readonly reportsRootDirectoryPath: string;

  constructor(baseDirectoryPath = process.cwd()) {
    this.reportsRootDirectoryPath = path.join(baseDirectoryPath, ".dx-tasks");
  }

  registerNamespace<TSchema extends z.ZodMiniType>(
    namespace: string,
    schema: TSchema,
  ): ReporterNamespace<TSchema> {
    const validatedNamespace = nonEmptyStringSchema.parse(namespace);

    if (this.registeredNamespaces.has(validatedNamespace)) {
      throw new Error(
        `Reporter namespace "${validatedNamespace}" is already registered`,
      );
    }

    this.registeredNamespaces.add(validatedNamespace);

    return {
      write: async (objectName, reportContent) => {
        const report = schema.parse(reportContent);
        const validatedObjectName = nonEmptyStringSchema.parse(objectName);
        const reportsDirectoryPath = path.join(
          this.reportsRootDirectoryPath,
          validatedNamespace,
        );
        const reportFilePath = path.join(
          reportsDirectoryPath,
          `${validatedObjectName}.json`,
        );
        const serializedReport = JSON.stringify(report, null, 2);

        if (serializedReport === undefined) {
          throw new Error("Failed to serialize report content as JSON");
        }

        await createReportDirectory(reportsDirectoryPath);
        await writeReportFile(reportFilePath, serializedReport);
      },
    };
  }
}
