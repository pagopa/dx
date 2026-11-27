// Retrieves the current job's step intervals for best-effort event correlation.

export async function fetchTimeline(config, fetchImpl = fetch) {
  const { now, runnerName, token } = config;
  const url = jobsUrl(config);
  const matches = [];
  for (let page = 1; page <= 100; page++) {
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    const response = await fetchImpl(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      throw new Error(`GitHub jobs API returned HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!data || !Array.isArray(data.jobs) || data.jobs.length > 100) {
      throw new Error("GitHub jobs API returned an invalid response");
    }
    matches.push(
      ...data.jobs.filter(
        (job) =>
          job?.runner_name === runnerName && job.status === "in_progress",
      ),
    );
    if (data.jobs.length < 100) break;
    if (page === 100)
      throw new Error("GitHub jobs API pagination limit exceeded");
  }

  if (matches.length !== 1 || !Array.isArray(matches[0].steps)) {
    throw new Error("Could not uniquely identify the current job");
  }

  return matches[0].steps.flatMap((step) => stepInterval(step, now));
}

function jobsUrl(config) {
  const { apiUrl, now, repository, runAttempt, runId, runnerName, token } =
    config;
  if (
    !apiUrl ||
    !/^[^/]+\/[^/]+$/.test(repository || "") ||
    !/^\d+$/.test(runId || "") ||
    !/^\d+$/.test(runAttempt || "") ||
    !runnerName ||
    !token ||
    !Number.isFinite(now)
  ) {
    throw new Error("Missing or invalid job context");
  }

  const api = new URL(apiUrl);
  if (api.protocol !== "https:" || api.username || api.password) {
    throw new Error("Invalid GitHub API URL");
  }

  const [owner, repo] = repository.split("/");
  return new URL(
    `${api.pathname.replace(/\/$/, "")}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs/${runId}/attempts/${runAttempt}/jobs`,
    api,
  );
}

function stepInterval(step, now) {
  if (!step?.started_at) return [];
  if (
    typeof step.started_at !== "string" ||
    (step.completed_at != null && typeof step.completed_at !== "string")
  ) {
    throw new Error("GitHub jobs API returned an invalid step");
  }
  const start = Date.parse(step.started_at);
  const end = step.completed_at ? Date.parse(step.completed_at) : now;
  if (
    typeof step.name !== "string" ||
    step.name.length === 0 ||
    step.name.length > 512 ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end < start
  ) {
    throw new Error("GitHub jobs API returned an invalid step");
  }
  // Generated "Run ..." names may contain commands; path-like names may contain files.
  if (
    /^(?:Post )?Run(?:\s|$)/i.test(step.name) ||
    /[/.\\\r\n`$;&|<>]/.test(step.name)
  ) {
    return [];
  }
  return [
    {
      end: Math.floor(end / 1000),
      name: step.name,
      start: Math.floor(start / 1000),
    },
  ];
}
