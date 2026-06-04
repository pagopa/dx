/**
 * Tests for the Commander spec adapter.
 *
 * Verifies that `extractCliSpec` correctly maps Commander's internal command
 * tree to the `CliSpec` domain type, covering options, arguments, and nested
 * subcommands.
 */

import { Argument, Command, Option } from "commander";
import { describe, expect, it } from "vitest";

import { extractCliSpec } from "../spec.js";

const buildRoot = () =>
  new Command("dx")
    .description("The CLI for DX-Platform")
    .version("1.2.3")
    .addOption(
      new Option("-v, --verbose", "Enable verbose output").default(false),
    )
    .addOption(
      new Option("--output <mode>", "Output mode")
        .choices(["text", "json"])
        .default("text"),
    );

const registerRootMetadataAndGlobalOptionTests = () => {
  describe("root metadata and global options", () => {
    it("maps the root command name, description and version", () => {
      const root = buildRoot();
      const spec = extractCliSpec(root, "1.2.3");

      expect(spec).toMatchObject({
        description: "The CLI for DX-Platform",
        name: "dx",
        specVersion: "1",
        version: "1.2.3",
      });
    });

    it("maps global options from the root command", () => {
      const root = buildRoot();
      const spec = extractCliSpec(root, "1.2.3");

      expect(
        spec.globalOptions.find((o) => o.long === "--verbose"),
      ).toStrictEqual({
        choices: [],
        defaultValue: false,
        description: "Enable verbose output",
        flags: "-v, --verbose",
        long: "--verbose",
        optional: false,
        required: false,
        short: "-v",
      });

      expect(
        spec.globalOptions.find((o) => o.long === "--output"),
      ).toStrictEqual({
        choices: ["text", "json"],
        defaultValue: "text",
        description: "Output mode",
        flags: "--output <mode>",
        long: "--output",
        optional: false,
        required: true,
        short: undefined,
      });
    });

    it("excludes help and version options from globalOptions", () => {
      const root = buildRoot();
      const spec = extractCliSpec(root, "1.2.3");

      const flags = spec.globalOptions.map((o) => o.long);
      expect(flags).not.toContain("--help");
      expect(flags).not.toContain("--version");
    });
  });
};

const registerCommandListTests = () => {
  describe("command lists", () => {
    it("maps a flat subcommand with options and no arguments", () => {
      const root = buildRoot();
      root.addCommand(
        new Command("doctor")
          .description("Run health checks")
          .addOption(new Option("--fix", "Auto-fix issues").default(false)),
      );

      const spec = extractCliSpec(root, "1.2.3");

      expect(spec.commands).toStrictEqual([
        {
          arguments: [],
          commands: [],
          description: "Run health checks",
          name: "doctor",
          options: [
            {
              choices: [],
              defaultValue: false,
              description: "Auto-fix issues",
              flags: "--fix",
              long: "--fix",
              optional: false,
              required: false,
              short: undefined,
            },
          ],
        },
      ]);
    });

    it("maps a subcommand argument (required)", () => {
      const root = buildRoot();
      root.addCommand(
        new Command("apply")
          .description("Apply something")
          .addArgument(new Argument("<id>", "The id of the item to apply")),
      );

      const spec = extractCliSpec(root, "1.2.3");

      expect(spec.commands).toStrictEqual([
        {
          arguments: [
            {
              choices: [],
              defaultValue: undefined,
              description: "The id of the item to apply",
              name: "id",
              required: true,
              variadic: false,
            },
          ],
          commands: [],
          description: "Apply something",
          name: "apply",
          options: [],
        },
      ]);
    });

    it("maps a variadic optional argument", () => {
      const root = buildRoot();
      root.addCommand(
        new Command("run")
          .description("Run scripts")
          .addArgument(new Argument("[scripts...]", "Scripts to run")),
      );

      const spec = extractCliSpec(root, "1.2.3");

      expect(spec.commands).toStrictEqual([
        {
          arguments: [
            {
              choices: [],
              defaultValue: undefined,
              description: "Scripts to run",
              name: "scripts",
              required: false,
              variadic: true,
            },
          ],
          commands: [],
          description: "Run scripts",
          name: "run",
          options: [],
        },
      ]);
    });

    it("includes commands registered with { hidden: true }", () => {
      const root = buildRoot();
      const visible = new Command("visible").description("Visible");
      const hidden = new Command("internal").description("Internal");
      root.addCommand(visible);
      root.addCommand(hidden, { hidden: true });

      const spec = extractCliSpec(root, "1.2.3");

      expect(spec.commands).toStrictEqual([
        {
          arguments: [],
          commands: [],
          description: "Visible",
          name: "visible",
          options: [],
        },
        {
          arguments: [],
          commands: [],
          description: "Internal",
          name: "internal",
          options: [],
        },
      ]);
    });

    it("excludes the spec command from the extracted command list", () => {
      const root = buildRoot();
      root.addCommand(new Command("doctor").description("Run health checks"));
      root.addCommand(new Command("spec").description("Print the CLI spec"));

      const spec = extractCliSpec(root, "1.2.3");

      expect(spec.commands).toStrictEqual([
        {
          arguments: [],
          commands: [],
          description: "Run health checks",
          name: "doctor",
          options: [],
        },
      ]);
    });

    it("returns empty commands array when root has no subcommands", () => {
      const root = buildRoot();
      const spec = extractCliSpec(root, "1.2.3");
      expect(spec.commands).toEqual([]);
    });

    it("maps an argument with choices", () => {
      const root = buildRoot();
      root.addCommand(
        new Command("format")
          .description("Format output")
          .addArgument(
            new Argument("<style>", "Output style").choices(["json", "table"]),
          ),
      );

      const spec = extractCliSpec(root, "1.2.3");

      expect(spec.commands).toStrictEqual([
        {
          arguments: [
            {
              choices: ["json", "table"],
              defaultValue: undefined,
              description: "Output style",
              name: "style",
              required: true,
              variadic: false,
            },
          ],
          commands: [],
          description: "Format output",
          name: "format",
          options: [],
        },
      ]);
    });
  });
};

const registerNestedCommandTests = () => {
  describe("nested commands", () => {
    it("recursively maps nested subcommands", () => {
      const root = buildRoot();
      const codemod = new Command("codemod").description("Manage codemods");
      codemod.addCommand(
        new Command("list").description("List available codemods"),
      );
      codemod.addCommand(
        new Command("apply")
          .description("Apply a codemod")
          .addArgument(new Argument("<id>", "Codemod id")),
      );
      root.addCommand(codemod);

      const spec = extractCliSpec(root, "1.2.3");

      expect(spec.commands).toStrictEqual([
        {
          arguments: [],
          commands: [
            {
              arguments: [],
              commands: [],
              description: "List available codemods",
              name: "list",
              options: [],
            },
            {
              arguments: [
                {
                  choices: [],
                  defaultValue: undefined,
                  description: "Codemod id",
                  name: "id",
                  required: true,
                  variadic: false,
                },
              ],
              commands: [],
              description: "Apply a codemod",
              name: "apply",
              options: [],
            },
          ],
          description: "Manage codemods",
          name: "codemod",
          options: [],
        },
      ]);
    });
  });
};

describe("extractCliSpec", () => {
  registerRootMetadataAndGlobalOptionTests();
  registerCommandListTests();
  registerNestedCommandTests();
});
