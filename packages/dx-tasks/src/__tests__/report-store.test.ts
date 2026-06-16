import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as z from "zod/mini";

import { ReportStore } from "../report-store.ts";

const terraformPlanSchema = z.object({
  modulePath: z.string(),
  planOutput: z.string(),
});

describe("ReportStore", () => {
  let tempDirectoryPath = "";

  const seedReport = async (
    namespace: string,
    objectName: string,
    content: unknown,
  ): Promise<void> => {
    const namespaceDirectoryPath = path.join(
      tempDirectoryPath,
      ".dx-tasks",
      namespace,
    );
    await fs.mkdir(namespaceDirectoryPath, { recursive: true });
    await fs.writeFile(
      path.join(namespaceDirectoryPath, `${objectName}.json`),
      JSON.stringify(content),
      "utf8",
    );
  };

  const createStore = () =>
    new ReportStore(tempDirectoryPath).register({
      name: "terraform-plan",
      schema: terraformPlanSchema,
    });

  beforeEach(async () => {
    tempDirectoryPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "dx-tasks-report-store-"),
    );
  });

  afterEach(async () => {
    await fs.rm(tempDirectoryPath, { force: true, recursive: true });
  });

  describe("register", () => {
    it("rejects duplicate namespace registrations", () => {
      const store = createStore();

      expect(() => {
        store.register({ name: "terraform-plan", schema: terraformPlanSchema });
      }).toThrow('Report namespace "terraform-plan" is already registered');
    });
  });

  describe("write", () => {
    it("writes validated reports under the namespace directory within the base directory", async () => {
      await createStore().write("terraform-plan", "bW9kdWxl", {
        modulePath: "/tmp/module",
        planOutput: "No changes.",
      });

      await expect(
        fs.readFile(
          path.join(
            tempDirectoryPath,
            ".dx-tasks",
            "terraform-plan",
            "bW9kdWxl.json",
          ),
          "utf8",
        ),
      ).resolves.toBe(`{
  "modulePath": "/tmp/module",
  "planOutput": "No changes."
}`);
    });

    it("rejects writes to namespaces that are not registered", async () => {
      await expect(
        createStore().write("unknown", "bW9kdWxl", {
          modulePath: "/tmp/module",
          planOutput: "No changes.",
        }),
      ).rejects.toThrow('Report namespace "unknown" is not registered');
    });

    it("rejects reports that do not match the schema", async () => {
      await expect(
        createStore().write(
          "terraform-plan",
          "bW9kdWxl",
          JSON.parse('{"modulePath":"/tmp/module","planOutput":1}'),
        ),
      ).rejects.toThrow();
    });

    it("wraps directory creation failures with reporter context", async () => {
      vi.spyOn(fs, "mkdir").mockRejectedValueOnce(new Error("EACCES"));

      await expect(
        createStore().write("terraform-plan", "bW9kdWxl", {
          modulePath: "/tmp/module",
          planOutput: "No changes.",
        }),
      ).rejects.toThrow(
        `Failed to create reporter namespace directory "${path.join(
          tempDirectoryPath,
          ".dx-tasks",
          "terraform-plan",
        )}"`,
      );
    });

    it("wraps report file write failures with reporter context", async () => {
      vi.spyOn(fs, "writeFile").mockRejectedValueOnce(new Error("EROFS"));

      await expect(
        createStore().write("terraform-plan", "bW9kdWxl", {
          modulePath: "/tmp/module",
          planOutput: "No changes.",
        }),
      ).rejects.toThrow(
        `Failed to write reporter file "${path.join(
          tempDirectoryPath,
          ".dx-tasks",
          "terraform-plan",
          "bW9kdWxl.json",
        )}"`,
      );
    });
  });

  describe("render", () => {
    it("renders registered namespaces and merges objects in deterministic order", async () => {
      await seedReport("demo", "b", { value: "second" });
      await seedReport("demo", "a", { value: "first" });
      const store = new ReportStore(tempDirectoryPath).register({
        name: "demo",
        renderers: { markdown: ({ value }) => `# ${value}` },
        schema: z.object({ value: z.string() }),
      });

      await expect(store.render("markdown")).resolves.toBe(
        "# first\n\n# second",
      );
    });

    it("skips namespaces that have no renderer registered for the format", async () => {
      await seedReport("demo", "a", { value: "kept" });
      await seedReport("unrendered", "a", { value: "ignored" });
      const store = new ReportStore(tempDirectoryPath)
        .register({
          name: "demo",
          renderers: { markdown: ({ value }) => `# ${value}` },
          schema: z.object({ value: z.string() }),
        })
        .register({
          name: "unrendered",
          schema: z.object({ value: z.string() }),
        });

      await expect(store.render("markdown")).resolves.toBe("# kept");
    });

    it("returns an empty string when no namespace is registered", async () => {
      await seedReport("demo", "a", { value: "ignored" });

      await expect(
        new ReportStore(tempDirectoryPath).render("markdown"),
      ).resolves.toBe("");
    });

    it("returns an empty string when the reports directory is missing", async () => {
      const store = new ReportStore(tempDirectoryPath).register({
        name: "demo",
        renderers: { markdown: ({ value }) => `# ${value}` },
        schema: z.object({ value: z.string() }),
      });

      await expect(store.render("markdown")).resolves.toBe("");
    });

    it("rejects reports that do not match the namespace schema", async () => {
      await seedReport("demo", "a", { value: 1 });
      const store = new ReportStore(tempDirectoryPath).register({
        name: "demo",
        renderers: { markdown: ({ value }) => `# ${value}` },
        schema: z.object({ value: z.string() }),
      });

      await expect(store.render("markdown")).rejects.toThrow();
    });
  });
});
