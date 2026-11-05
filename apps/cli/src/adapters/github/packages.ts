import { getGitHubPAT } from "../octokit/index.js";

/**
 * npm registry that hosts the DX packages inside GitHub Packages. Generated
 * repositories install the DX plugins from here through pnpm's `gh:` alias.
 */
export const GITHUB_PACKAGES_REGISTRY = "https://npm.pkg.github.com";

/**
 * DX package used to probe the registry. It is the first `gh:@pagopa/*`
 * dependency that `dx init` installs into the generated workspace (see
 * `NX_TERRAFORM_DEPENDENCY`), so reading it proves the DX packages are
 * reachable.
 */
export const GITHUB_PACKAGES_PROBE_PACKAGE = "@pagopa/nx-terraform";

const MISSING_TOKEN_MESSAGE =
  "You need to be logged in to GitHub. Run `gh auth login`, or set the GH_TOKEN or GITHUB_TOKEN environment variable.";

const READ_PACKAGES_MESSAGE = [
  "Your GitHub token cannot read the DX packages from GitHub Packages: the registry requires the read:packages scope.",
  "Run `gh auth refresh --scopes read:packages` (or set GITHUB_TOKEN to a personal access token that includes read:packages) and try again.",
].join(" ");

/**
 * Verifies that the current GitHub credentials can read the DX packages from
 * GitHub Packages.
 *
 * GitHub Packages requires a token with the `read:packages` scope. Without it,
 * `dx init` only fails once the bootstrap installs the DX plugins, after the
 * workspace has already been scaffolded. Probing the registry before the
 * prompts turns that into an immediate, actionable error.
 */
export const assertGitHubPackagesAccess = async (): Promise<void> => {
  const token = await getGitHubPAT();
  if (!token) {
    throw new Error(MISSING_TOKEN_MESSAGE);
  }

  let response: Response;
  try {
    response = await fetch(
      `${GITHUB_PACKAGES_REGISTRY}/${encodeURIComponent(GITHUB_PACKAGES_PROBE_PACKAGE)}`,
      {
        headers: {
          accept: "application/json",
          authorization: `Bearer ${token}`,
        },
      },
    );
  } catch (cause) {
    throw new Error(
      "Failed to reach GitHub Packages while verifying access to the DX packages.",
      { cause },
    );
  }

  if (response.ok) {
    return;
  }

  // GitHub Packages answers 401/403 when the token lacks the read:packages
  // scope; any other status is an unexpected registry failure.
  if (response.status === 401 || response.status === 403) {
    throw new Error(`${READ_PACKAGES_MESSAGE} (HTTP ${response.status})`);
  }

  throw new Error(
    `Unexpected response from GitHub Packages while checking access to ${GITHUB_PACKAGES_PROBE_PACKAGE} (HTTP ${response.status}).`,
  );
};
