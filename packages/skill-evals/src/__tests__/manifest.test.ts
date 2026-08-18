/**
 * Verifies the portable manifest validator independently from Copilot.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { validateManifest } from "../manifest.js";
import { temporaryDirectory } from "./temporary-directory.js";

const validManifest = {
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
  runner: {
    available_tools: ["view"],
    prompt_prefix: "Invoke the skill.",
    supporting_skills: [],
  },
  schema_version: 1,
  skill_name: "example-skill",
  validation: {
    coverage: {
      catalog: "references/guardrails.md",
      pattern: "SK-G[0-9]{2}",
      require_all: true,
    },
    required_fixture_prefixes: ["evals/scaffolds/base/repository/"],
  },
};

const createSkill = async (): Promise<string> => {
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
      JSON.stringify(validManifest),
    ),
    writeFile(join(directory, "evals/grader.md"), "Grade the output."),
    writeFile(join(directory, "evals/rubric.md"), "Apply the rubric."),
    writeFile(
      join(directory, "evals/scaffolds/base/repository/README.md"),
      "fixture",
    ),
    writeFile(join(directory, "references/guardrails.md"), "# SK-G01\n"),
  ]);
  return directory;
};

describe("validateManifest", () => {
  it("validates referenced fixtures and complete guardrail coverage", async () => {
    const skillDirectory = await createSkill();

    const result = await validateManifest(skillDirectory, true);

    expect(result).toEqual({
      evalCount: 1,
      guardrailCount: 1,
      warnings: [],
    });
  });

  it("rejects duplicate fixture targets", async () => {
    const skillDirectory = await createSkill();
    const duplicate = structuredClone(validManifest);
    duplicate.evals[0].files.push(
      "evals/scaffolds/overlay/repository/README.md",
    );
    await mkdir(join(skillDirectory, "evals/scaffolds/overlay/repository"), {
      recursive: true,
    });
    await Promise.all([
      writeFile(
        join(skillDirectory, "evals/scaffolds/overlay/repository/README.md"),
        "duplicate",
      ),
      writeFile(
        join(skillDirectory, "evals/evals.json"),
        JSON.stringify(duplicate),
      ),
    ]);

    await expect(validateManifest(skillDirectory, true)).rejects.toThrow(
      "maps multiple files to README.md",
    );
  });
});
