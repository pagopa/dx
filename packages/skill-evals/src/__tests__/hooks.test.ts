/**
 * Verifies skill-owned eval hooks without invoking Copilot.
 */
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { runSkillHook } from "../hooks.js";
import { validateManifest } from "../manifest.js";
import { temporaryDirectory } from "./temporary-directory.js";

const hookEnvironment = (): NodeJS.ProcessEnv => ({
  PATH: process.env.PATH ?? "/usr/bin:/bin",
});

const writeExecutable = async (path: string, body: string): Promise<void> => {
  await writeFile(path, body);
  await chmod(path, 0o755);
};

describe("runSkillHook", () => {
  it("returns an empty object when the hook is not declared", async () => {
    const output = await runSkillHook(
      {},
      "before_each",
      {
        outputDirectory: "/tmp",
        skillDirectory: "/tmp",
      },
      {},
    );

    expect(output).toEqual({});
  });

  it("merges JSON written by after_each", async () => {
    const skillDirectory = await temporaryDirectory();
    const script = join(skillDirectory, "evals/scripts/after-each.sh");
    await mkdir(join(skillDirectory, "evals/scripts"), { recursive: true });
    await writeExecutable(
      script,
      "#!/usr/bin/env bash\nprintf '{\"formatted\": true}\\n'\n",
    );

    const output = await runSkillHook(
      { after_each: "evals/scripts/after-each.sh" },
      "after_each",
      {
        outputDirectory: skillDirectory,
        skillDirectory,
        workspace: skillDirectory,
      },
      hookEnvironment(),
    );

    expect(output).toEqual({ formatted: true });
  });

  it("fails when a declared hook exits non-zero", async () => {
    const skillDirectory = await temporaryDirectory();
    const script = join(skillDirectory, "evals/scripts/before-all.sh");
    await mkdir(join(skillDirectory, "evals/scripts"), { recursive: true });
    await writeExecutable(
      script,
      "#!/usr/bin/env bash\necho failed >&2\nexit 1\n",
    );

    await expect(
      runSkillHook(
        { before_all: "evals/scripts/before-all.sh" },
        "before_all",
        {
          outputDirectory: skillDirectory,
          skillDirectory,
        },
        hookEnvironment(),
      ),
    ).rejects.toThrow("Hook before_all");
  });
});

describe("validateManifest hooks", () => {
  it("rejects a declared hook that is missing on disk", async () => {
    const directory = await temporaryDirectory();
    await Promise.all([
      mkdir(join(directory, "evals/scaffolds/base/repository"), {
        recursive: true,
      }),
      mkdir(join(directory, "references"), { recursive: true }),
    ]);
    await Promise.all([
      writeFile(
        join(directory, "evals/evals.json"),
        JSON.stringify({
          evals: [
            {
              assertions: ["[SK-G01] Uses the required behavior."],
              expected_output: "A complete result.",
              files: ["evals/scaffolds/base/repository/README.md"],
              fixture_required: true,
              id: 1,
              knowledge_base: "unavailable",
              name: "complete-result",
              prompt: "Produce the result.",
            },
          ],
          grading: {
            instructions: "evals/grader.md",
            rubric: "evals/rubric.md",
          },
          hooks: {
            after_each: "evals/scripts/after-each.sh",
          },
          runner: {
            available_tools: ["view"],
            prompt_prefix: "Invoke the skill.",
          },
          schema_version: 1,
          skill_name: "example-skill",
          validation: {
            coverage: {
              catalog: "references/guardrails.md",
              pattern: "SK-G[0-9]{2}",
              require_all: true,
            },
          },
        }),
      ),
      writeFile(join(directory, "evals/grader.md"), "Grade the output."),
      writeFile(join(directory, "evals/rubric.md"), "Apply the rubric."),
      writeFile(
        join(directory, "evals/scaffolds/base/repository/README.md"),
        "fixture",
      ),
      writeFile(join(directory, "references/guardrails.md"), "# SK-G01\n"),
    ]);

    await expect(validateManifest(directory, true)).rejects.toThrow(
      "Missing after_each hook: evals/scripts/after-each.sh",
    );
  });
});
