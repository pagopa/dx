import { DependencyType } from "@nx/devkit";
import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getStaticDependenciesFromFile } from "../fs.ts";
import { ProjectFile } from "../project-file.ts";

describe("getStaticDependenciesFromFile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads terraform file content and returns extracted dependencies", async () => {
    const file: ProjectFile = {
      fileName: path.join("infra", "resources", "dev", "main.tf"),
      project: "resources-dev",
    };

    const fileContent = `
module "foo" {
  source = "../_modules/foo"
}
`;

    const readFileSpy = vi.spyOn(fs, "readFile").mockResolvedValue(fileContent);

    const dependencies = await getStaticDependenciesFromFile(file);

    expect(readFileSpy).toHaveBeenCalledWith(file.fileName, "utf-8");
    expect(dependencies).toEqual([
      {
        source: "resources-dev",
        sourceFile: path.join("infra", "resources", "dev", "main.tf"),
        target: "resources-modules-foo",
        type: DependencyType.static,
      },
    ]);
  });

  it("returns an empty array when file reading fails", async () => {
    const file: ProjectFile = {
      fileName: path.join("infra", "resources", "dev", "main.tf"),
      project: "resources-dev",
    };

    const readError = new Error("cannot read terraform file");
    vi.spyOn(fs, "readFile").mockRejectedValue(readError);
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const dependencies = await getStaticDependenciesFromFile(file);

    expect(dependencies).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `Error reading file ${file.fileName}:`,
      readError,
    );
  });
});
