// Verifies that the source URLs of a Jira issue exist for the assess-jira-implementation-readiness skill.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REQUEST_TIMEOUT_MS = 10_000;

function normalize(url) {
  if (typeof url !== "string") {
    return null;
  }
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    // Fragments are never sent to the server; they cannot be verified remotely.
    parsed.hash = "";
    return parsed.href;
  } catch {
    return null;
  }
}

async function request(fetchImpl, url, method) {
  return fetchImpl(url, {
    method,
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

async function checkUrl(url, fetchImpl) {
  try {
    let response = await request(fetchImpl, url, "HEAD");
    // Some servers reject HEAD; retry with GET before judging the URL.
    if (!response.ok) {
      response = await request(fetchImpl, url, "GET");
    }
    return {
      url,
      result: response.ok ? "pass" : "fail",
      status: response.status,
    };
  } catch (error) {
    // A network failure does not prove the document is missing.
    return { url, result: "unverifiable", status: null, reason: error.message };
  }
}

export async function checkSources(sources, fetchImpl = fetch) {
  const urls = [];
  const invalid = [];
  for (const source of sources) {
    const url = normalize(source?.url);
    if (url === null) {
      invalid.push({
        url: typeof source?.url === "string" ? source.url : null,
        result: "fail",
        status: null,
        reason: "Not an absolute http(s) URL.",
      });
    } else if (!urls.includes(url)) {
      urls.push(url);
    }
  }

  const checked = await Promise.all(
    urls.map((url) => checkUrl(url, fetchImpl)),
  );
  const results = [...invalid, ...checked];
  const outcomes = results.map(({ result }) => result);

  return {
    verdict: outcomes.includes("fail")
      ? "Not ready"
      : outcomes.includes("unverifiable")
        ? "Unable to assess"
        : "Ready",
    sources: results,
  };
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log("Usage: node check-sources.js < sources.json");
    console.log('Reads a JSON array of {"url": "..."} from standard input.');
    return;
  }

  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let sources;
  try {
    sources = JSON.parse(input);
  } catch (error) {
    console.error(`Invalid sources JSON: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  if (!Array.isArray(sources)) {
    console.error("Invalid sources JSON: expected an array.");
    process.exitCode = 1;
    return;
  }

  // Exit successfully for any evaluated verdict; only invalid input is an error.
  console.log(JSON.stringify(await checkSources(sources)));
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
