// Extracts linked Confluence pages once per site-scoped ID and rejects collisions.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function unwrapIssue(response) {
  if (!isObject(response)) {
    throw new Error("Jira response must be a JSON object.");
  }
  if (response.isError === true || Object.hasOwn(response, "error")) {
    const detail =
      response.error ??
      response.content ??
      (Object.hasOwn(response, "status") || Object.hasOwn(response, "message")
        ? { status: response.status, message: response.message }
        : null);
    throw new Error(
      `Jira response is an error, not an issue: ${JSON.stringify(detail)}`,
    );
  }
  if (!Object.hasOwn(response, "key") && isObject(response.data)) {
    return response.data;
  }
  return response;
}

const CONFLUENCE_URL_PATTERN =
  /https?:\/\/[a-z0-9-]+\.atlassian\.net\/wiki\/[^\s"'<>()[\]\\`|]*/gi;
function confluencePageDetails(url) {
  let parsed;
  try {
    parsed = new URL(url.replaceAll("&amp;", "&"));
  } catch {
    return undefined;
  }
  const fromPath = parsed.pathname.match(/\/pages\/(\d+)(?:\/|$)/);
  const fromQuery = parsed.searchParams.get("pageId");
  let id;
  if (fromPath) {
    id = fromPath[1];
  } else if (/^\d+$/.test(fromQuery ?? "")) {
    id = fromQuery;
  }
  return id === undefined ? undefined : { id, site: parsed.hostname };
}

// Lists linked pages once per ID in first-seen order; rejects cross-site ID collisions.
export function extractConfluenceLinks(description) {
  const text =
    typeof description === "string"
      ? description
      : JSON.stringify(description ?? "");
  const pages = new Map();
  const unresolved = new Set();
  for (const [match] of text.matchAll(CONFLUENCE_URL_PATTERN)) {
    const url = match.replace(/[.,;:!?*_~]+$/, "");
    const page = confluencePageDetails(url);
    if (page === undefined) {
      unresolved.add(url);
    } else {
      const existing = pages.get(page.id);
      if (existing && existing.site !== page.site) {
        throw new Error(
          `Confluence page ID ${page.id} is linked from multiple sites: ${existing.site} and ${page.site}.`,
        );
      }
      if (!existing) {
        pages.set(page.id, { url, site: page.site });
      }
    }
  }
  return {
    pages: [...pages].map(([id, { url }]) => ({ id, url })),
    unresolved: [...unresolved],
  };
}

const USAGE = "Usage: node extract-confluence-links.js <jira-response.json>";

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || args[0] === "--help") {
    if (args[0] === "--help") {
      console.log(USAGE);
    } else {
      console.error(USAGE);
      process.exitCode = 1;
    }
    return;
  }
  try {
    const issue = unwrapIssue(JSON.parse(await readFile(args[0], "utf8")));
    if (
      !isObject(issue.fields) ||
      !Object.hasOwn(issue.fields, "description")
    ) {
      throw new Error("Jira issue has no fields.description.");
    }
    console.log(
      JSON.stringify(extractConfluenceLinks(issue.fields.description), null, 2),
    );
  } catch (error) {
    console.error(`Links not extracted: ${error.message}`);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
