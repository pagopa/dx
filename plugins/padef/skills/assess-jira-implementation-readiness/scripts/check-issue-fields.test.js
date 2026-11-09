// Exercises the Jira metadata gate independently of Jira connectivity.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { checkIssueFields } from "./check-issue-fields.js";

const script = fileURLToPath(
  new URL("./check-issue-fields.js", import.meta.url),
);

function issue(statusName, categoryKey, type, links = []) {
  return {
    fields: {
      status: { name: statusName, statusCategory: { key: categoryKey } },
      issuetype: { name: type },
      issuelinks: links,
    },
  };
}

test("accepts each eligible type in the new status category", () => {
  for (const type of ["Story", "Task", "Bug"]) {
    assert.deepEqual(checkIssueFields(issue("To Do", "new", type)), {
      verdict: "Ready",
      status: {
        result: "pass",
        value: "To Do",
        hint: "The issue must be in a status for work to do.",
      },
      issueType: { result: "pass", value: type },
      blockers: { result: "pass", pending: [], unverifiable: [] },
    });
  }
});

test("uses the category key rather than status name or category label", () => {
  assert.equal(
    checkIssueFields(issue("In Progress", "new", "Task")).verdict,
    "Ready",
  );
  assert.equal(
    checkIssueFields(issue("Backlog", "indeterminate", "Task")).verdict,
    "Not ready",
  );
  assert.equal(
    checkIssueFields(issue("Backlog", "New", "Task")).verdict,
    "Not ready",
  );
});

test("reports both failing fields", () => {
  assert.deepEqual(checkIssueFields(issue("Backlog", "done", "Epic")), {
    verdict: "Not ready",
    status: {
      result: "fail",
      value: "Backlog",
      hint: "The issue must be in a status for work to do.",
    },
    issueType: { result: "fail", value: "Epic" },
    blockers: { result: "pass", pending: [], unverifiable: [] },
  });
});

test("distinguishes missing fields from failures", () => {
  assert.equal(checkIssueFields({ fields: {} }).verdict, "Unable to assess");
  assert.equal(
    checkIssueFields({
      fields: { status: { name: "Backlog" }, issuetype: { name: "Task" } },
    }).verdict,
    "Unable to assess",
  );
  assert.deepEqual(checkIssueFields(issue("Backlog", null, "Task")), {
    verdict: "Unable to assess",
    status: {
      result: "unverifiable",
      value: "Backlog",
      hint: "The issue must be in a status for work to do.",
    },
    issueType: { result: "pass", value: "Task" },
    blockers: { result: "pass", pending: [], unverifiable: [] },
  });
  assert.deepEqual(
    checkIssueFields(issue("In Progress", "indeterminate", null)),
    {
      verdict: "Not ready",
      status: {
        result: "fail",
        value: "In Progress",
        hint: "The issue must be in a status for work to do.",
      },
      issueType: { result: "unverifiable", value: null },
      blockers: { result: "pass", pending: [], unverifiable: [] },
    },
  );
});

function link(key, categoryKey, statusName = "In Progress", type = "Blocks") {
  return {
    type: { name: type },
    inwardIssue: {
      key,
      fields: {
        status: { name: statusName, statusCategory: { key: categoryKey } },
      },
    },
  };
}

test("accepts completed blockers and ignores outgoing and unrelated links", () => {
  const links = [
    link("TEST-1", "done", "Done"),
    link("TEST-2", "new", "Open", "Relates"),
    { type: { name: "Blocks" }, outwardIssue: { key: "TEST-3" } },
  ];
  assert.deepEqual(
    checkIssueFields(issue("Open", "new", "Task", links)).blockers,
    {
      result: "pass",
      pending: [],
      unverifiable: [],
    },
  );
  assert.equal(
    checkIssueFields(issue("Open", "new", "Task", links)).verdict,
    "Ready",
  );
});

test("reports every unfinished blocker, including category none", () => {
  const links = [
    link("TEST-1", "new", "Open"),
    link("TEST-2", "none", "Uncategorized"),
    link("TEST-3", "done", "Done"),
    link("TEST-4", "indeterminate", "In Progress"),
  ];
  const output = checkIssueFields(issue("Open", "new", "Task", links));
  assert.equal(output.verdict, "Not ready");
  assert.deepEqual(output.blockers, {
    result: "fail",
    pending: [
      { key: "TEST-1", status: "Open" },
      { key: "TEST-2", status: "Uncategorized" },
      { key: "TEST-4", status: "In Progress" },
    ],
    unverifiable: [],
  });
});

test("does not assume missing links or blocker metadata means no blockers", () => {
  const missingLinks = issue("Open", "new", "Task");
  delete missingLinks.fields.issuelinks;
  assert.equal(checkIssueFields(missingLinks).verdict, "Unable to assess");

  const links = [
    link("TEST-1", null),
    { inwardIssue: { key: "TEST-2" } },
    null,
  ];
  const output = checkIssueFields(issue("Open", "new", "Task", links));
  assert.equal(output.verdict, "Unable to assess");
  assert.deepEqual(output.blockers.unverifiable, [
    { key: "TEST-1", status: "In Progress" },
    { key: "TEST-2", status: null },
    { key: null, status: null },
  ]);
});

test("reports pending and unverifiable blockers together", () => {
  const output = checkIssueFields(
    issue("Open", "new", "Task", [link("TEST-1", "new"), link("TEST-2", null)]),
  );
  assert.equal(output.verdict, "Not ready");
  assert.equal(output.blockers.result, "fail");
  assert.equal(output.blockers.pending[0].key, "TEST-1");
  assert.equal(output.blockers.unverifiable[0].key, "TEST-2");
});

test("treats ambiguous or malformed link directions and missing types as unverifiable", () => {
  const links = [
    { ...link("TEST-1", "done", "Done"), outwardIssue: { key: "TEST-2" } },
    { type: { name: "Blocks" }, outwardIssue: "TEST-3" },
    { outwardIssue: { key: "TEST-4" } },
    { type: { name: "Relates" } },
  ];
  const result = checkIssueFields(issue("Open", "new", "Task", links));
  assert.equal(result.verdict, "Unable to assess");
  assert.equal(result.blockers.unverifiable.length, links.length);
});

test("does not infer or require a missing status name", () => {
  const result = checkIssueFields(issue(undefined, "new", "Task"));
  assert.equal(result.verdict, "Ready");
  assert.equal(result.status.value, null);
});

test("reads a Jira response from stdin and prints JSON", () => {
  const result = spawnSync(process.execPath, [script], {
    input: JSON.stringify(issue("Open", "new", "Task")),
    encoding: "utf8",
  });
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.verdict, "Ready");
  assert.equal(output.status.value, "Open");
  assert.equal(
    output.status.hint,
    "The issue must be in a status for work to do.",
  );
});

test("rejects malformed or non-object JSON", () => {
  for (const input of ["{", "null", "[]", '"issue"']) {
    const result = spawnSync(process.execPath, [script], {
      input,
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Invalid Jira issue JSON/);
    assert.equal(result.stdout, "");
  }
});
