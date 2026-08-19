/**
 * Verifies failed-constraint collection stays silent on pass and names
 * grader, hook, and runner failures with a reason when one exists.
 */
import { describe, expect, it } from "vitest";

import {
  collectFailedConstraints,
  formatFailedConstraint,
  formatFailedConstraintMarkdown,
  formatFailedConstraints,
} from "../constraints.js";
import { type MechanicalChecks } from "../copilot-run.js";
import { type VariantGrade } from "../grader.js";

const mechanical = (
  overrides: Partial<MechanicalChecks> = {},
): MechanicalChecks => ({
  addedPlaceholders: false,
  diffCheck: true,
  executionSuccess: true,
  skillInvoked: true,
  skillLoaded: true,
  ...overrides,
});

const grade = (overrides: Partial<VariantGrade> = {}): VariantGrade => ({
  assertions: [
    { assertion: "No secrets.", evidence: "none written", passed: true },
  ],
  gates: { safety: true },
  pass: false,
  rubric: [{ criterion: "Quality", evidence: "weak", score: 1 }],
  summary: "Not good enough.",
  ...overrides,
});

describe("collectFailedConstraints", () => {
  it("returns nothing when the variant passed", () => {
    expect(
      collectFailedConstraints(
        grade({ gates: { safety: false }, pass: true }),
        mechanical({ terraformFormat: false }),
        { requireSkill: true },
      ),
    ).toEqual([]);
  });

  it("lists failed grader gates and assertions with evidence", () => {
    expect(
      collectFailedConstraints(
        grade({
          assertions: [
            {
              assertion: "No secrets.",
              evidence: "DATABASE_PASSWORD in locals",
              passed: false,
            },
          ],
          gates: { completeness: true, safety: false },
        }),
        mechanical(),
        { requireSkill: true },
      ),
    ).toEqual([
      { name: "safety", source: "grader" },
      {
        name: "No secrets.",
        reason: "DATABASE_PASSWORD in locals",
        source: "grader",
      },
    ]);
  });

  it("lists hook mechanical checks that are false", () => {
    expect(
      collectFailedConstraints(
        grade(),
        mechanical({ lintClean: true, terraformFormat: false }),
        { requireSkill: true },
      ),
    ).toEqual([{ name: "terraformFormat", source: "hook" }]);
  });

  it("ignores null hook values and built-in mechanical facts", () => {
    expect(
      collectFailedConstraints(
        grade({
          assertions: [
            {
              assertion: "Uses the module.",
              evidence: "missing",
              passed: false,
            },
          ],
        }),
        mechanical({
          addedPlaceholders: true,
          diffCheck: false,
          terraformFormat: null,
        }),
        { requireSkill: true },
      ),
    ).toEqual([
      { name: "Uses the module.", reason: "missing", source: "grader" },
    ]);
  });

  it("lists runner execution and skill constraints when required", () => {
    expect(
      collectFailedConstraints(
        grade({ assertions: [], gates: {} }),
        mechanical({
          executionSuccess: false,
          skillInvoked: false,
          skillLoaded: false,
        }),
        { requireSkill: true },
      ),
    ).toEqual([
      {
        name: "executionSuccess",
        reason: "Copilot exited unsuccessfully",
        source: "runner",
      },
      {
        name: "skillLoaded",
        reason: "evaluated skill was not loaded",
        source: "runner",
      },
      {
        name: "skillInvoked",
        reason: "evaluated skill was not invoked",
        source: "runner",
      },
    ]);
  });

  it("does not require skill load or invoke on baseline", () => {
    expect(
      collectFailedConstraints(
        grade({
          assertions: [
            {
              assertion: "Uses the module.",
              evidence: "raw resource",
              passed: false,
            },
          ],
        }),
        mechanical({ skillInvoked: false, skillLoaded: false }),
        { requireSkill: false },
      ),
    ).toEqual([
      { name: "Uses the module.", reason: "raw resource", source: "grader" },
    ]);
  });

  it("records a grading error as a grader constraint", () => {
    expect(
      collectFailedConstraints(
        grade({ assertions: [], gates: {} }),
        mechanical(),
        {
          gradingError: "The automated grader did not return valid JSON.",
          requireSkill: true,
        },
      ),
    ).toEqual([
      {
        name: "validGrade",
        reason: "The automated grader did not return valid JSON.",
        source: "grader",
      },
    ]);
  });

  it("falls back to the grader summary when no check is named", () => {
    expect(
      collectFailedConstraints(
        grade({ assertions: [], gates: {} }),
        mechanical(),
        {
          requireSkill: true,
        },
      ),
    ).toEqual([{ name: "pass", reason: "Not good enough.", source: "grader" }]);
  });
});

describe("formatFailedConstraints", () => {
  it("includes the source and reason when present", () => {
    expect(
      formatFailedConstraint({
        name: "safety",
        source: "grader",
      }),
    ).toBe("safety (grader)");
    expect(
      formatFailedConstraints([
        { name: "safety", source: "grader" },
        {
          name: "No secrets.",
          reason: "DATABASE_PASSWORD in locals",
          source: "grader",
        },
        { name: "terraformFormat", source: "hook" },
      ]),
    ).toBe(
      "safety (grader); No secrets. (grader): DATABASE_PASSWORD in locals; terraformFormat (hook)",
    );
    expect(
      formatFailedConstraintMarkdown({
        name: "No secrets.",
        reason: "DATABASE_PASSWORD in locals",
        source: "grader",
      }),
    ).toBe("`No secrets.` (grader): DATABASE_PASSWORD in locals");
  });
});
