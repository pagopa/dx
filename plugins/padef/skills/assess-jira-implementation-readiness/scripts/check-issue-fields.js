// Evaluates the Jira metadata gate for the assess-jira-implementation-readiness skill.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ALLOWED_STATUS_CATEGORIES = Object.freeze(["new"]);
export const ALLOWED_ISSUE_TYPES = Object.freeze(["Story", "Task", "Bug"]);
export const STATUS_CATEGORY_HINT =
  "The issue must be in a status for work to do.";
export const COMPLETED_STATUS_CATEGORY = "done";

function checkField(value, allowedValues) {
  if (typeof value !== "string" || value.length === 0) {
    return { result: "unverifiable", value: null };
  }

  return {
    result: allowedValues.includes(value) ? "pass" : "fail",
    value,
  };
}

function checkBlockers(links) {
  if (!Array.isArray(links)) {
    return {
      result: "unverifiable",
      pending: [],
      unverifiable: [],
      reason: "Issue links are unavailable.",
    };
  }

  const pending = [];
  const unverifiable = [];
  for (const link of links) {
    if (!link || typeof link !== "object" || Array.isArray(link)) {
      unverifiable.push({ key: null, status: null });
      continue;
    }
    const inward = link.inwardIssue;
    const name = link.type?.name;
    const blocker = {
      key: typeof inward?.key === "string" && inward.key ? inward.key : null,
      status:
        typeof inward?.fields?.status?.name === "string" &&
        inward.fields.status.name
          ? inward.fields.status.name
          : null,
    };
    const hasInward = Object.hasOwn(link, "inwardIssue");
    const hasOutward = Object.hasOwn(link, "outwardIssue");
    const linkedIssue = hasInward ? inward : link.outwardIssue;
    // Exactly one direction is required to tell whether this issue is blocked.
    if (
      hasInward === hasOutward ||
      !linkedIssue ||
      typeof linkedIssue !== "object" ||
      Array.isArray(linkedIssue) ||
      typeof name !== "string" ||
      !name
    ) {
      unverifiable.push(blocker);
      continue;
    }
    // Outward links describe issues this issue blocks, not its own blockers.
    if (hasOutward || name !== "Blocks") {
      continue;
    }
    const category = inward?.fields?.status?.statusCategory?.key;
    if (typeof category !== "string" || !category) {
      unverifiable.push(blocker);
    } else if (category !== COMPLETED_STATUS_CATEGORY) {
      // "none" is also unfinished; only "done" clears a blocker.
      pending.push(blocker);
    }
  }

  return {
    result: pending.length
      ? "fail"
      : unverifiable.length
        ? "unverifiable"
        : "pass",
    pending,
    unverifiable,
  };
}

export function checkIssueFields(issue) {
  // Jira status names are for display; category keys determine readiness.
  const statusCategory = checkField(
    issue?.fields?.status?.statusCategory?.key,
    ALLOWED_STATUS_CATEGORIES,
  );
  const statusName = issue?.fields?.status?.name;
  const status = {
    result: statusCategory.result,
    value:
      typeof statusName === "string" && statusName.length > 0
        ? statusName
        : null,
    hint: STATUS_CATEGORY_HINT,
  };
  const issueType = checkField(
    issue?.fields?.issuetype?.name,
    ALLOWED_ISSUE_TYPES,
  );
  const blockers = checkBlockers(issue?.fields?.issuelinks);
  const results = [status.result, issueType.result, blockers.result];

  // A known failure takes precedence over missing evidence in other checks.
  // This verdict covers metadata only; the skill separately assesses the description.
  return {
    verdict: results.includes("fail")
      ? "Not ready"
      : results.includes("unverifiable")
        ? "Unable to assess"
        : "Ready",
    status,
    issueType,
    blockers,
  };
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log("Usage: node check-issue-fields.js < jira-issue.json");
    console.log("Reads a Jira issue JSON object from standard input.");
    return;
  }

  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let issue;
  try {
    issue = JSON.parse(input);
  } catch (error) {
    console.error(`Invalid Jira issue JSON: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  if (issue === null || typeof issue !== "object" || Array.isArray(issue)) {
    console.error("Invalid Jira issue JSON: expected an object.");
    process.exitCode = 1;
    return;
  }

  // Exit successfully for any evaluated verdict; only invalid input is an error.
  console.log(JSON.stringify(checkIssueFields(issue)));
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
