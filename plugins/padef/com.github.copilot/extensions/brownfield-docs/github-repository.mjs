// Identifies and validates GitHub repository sources for the canvas state.
export function isValidGitHubRepository(value) {
  if (typeof value !== "string") return false;
  const [owner, repository, ...extra] = value.split("/");
  return (
    extra.length === 0 &&
    isValidOwner(owner) &&
    isValidRepositoryName(repository)
  );
}

export function isValidGitHubRepositories(repositories) {
  if (!Array.isArray(repositories) || repositories.length > 500) return false;
  const seen = new Set();
  return repositories.every((repository) => {
    if (
      !repository ||
      typeof repository !== "object" ||
      Array.isArray(repository) ||
      !isValidGitHubRepository(repository.fullName)
    ) {
      return false;
    }
    const key = repository.fullName.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function initialGitHubRepositories(saved) {
  return saved ?? [];
}

export function parseGitHubRemote(remote) {
  if (typeof remote !== "string" || !remote) return null;

  let host;
  let path;
  const scpRemote = /^(?:[^@/:]+@)?github\.com:([^?#]+)$/i.exec(remote);
  if (scpRemote) {
    host = "github.com";
    path = scpRemote[1];
  } else {
    let url;
    try {
      url = new URL(remote);
    } catch {
      return null;
    }
    if (
      !["https:", "http:", "ssh:"].includes(url.protocol) ||
      url.hostname.toLowerCase() !== "github.com"
    ) {
      return null;
    }
    host = url.hostname;
    path = url.pathname;
  }

  if (host.toLowerCase() !== "github.com") return null;
  const segments = path.replace(/^\/+|\/+$/g, "").split("/");
  if (segments.length !== 2) return null;
  const repository = segments[1].replace(/\.git$/i, "");
  const fullName = `${segments[0]}/${repository}`;
  return isValidGitHubRepository(fullName) ? fullName : null;
}

function isValidOwner(value) {
  return (
    typeof value === "string" &&
    value.length <= 39 &&
    /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(value)
  );
}

function isValidRepositoryName(value) {
  return (
    typeof value === "string" &&
    value.length <= 100 &&
    /^[A-Za-z0-9._-]+$/.test(value) &&
    value !== "." &&
    value !== ".."
  );
}
