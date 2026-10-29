/**
 * Checks the authentication selected by Git before publishing workflow files.
 */
import type { Options } from "execa";

import { getLogger } from "@logtape/logtape";
import { $ } from "execa";
import { z } from "zod";

const gitOptions = {
  env: {
    GCM_INTERACTIVE: "never",
    GH_DEBUG: "",
    GIT_ASKPASS: "",
    GIT_CURL_VERBOSE: undefined,
    GIT_TERMINAL_PROMPT: "0",
    GIT_TRACE: "0",
    GIT_TRACE2: "0",
    GIT_TRACE2_EVENT: "0",
    GIT_TRACE2_PERF: "0",
    GIT_TRACE_CURL: "0",
    SSH_ASKPASS: "",
  },
  reject: false,
  shell: false,
  timeout: 15_000,
  verbose: "none",
} satisfies Options;

const warnUnverified = (reason: string): void => {
  getLogger(["dx-cli", "git-auth"]).warn(
    `${reason} Continuing without verifying workflow-write permission; ensure the Git credential can update .github/workflows files.`,
  );
};

const readGitPushUrl = async (): Promise<string> => {
  const result = await $(gitOptions)`git remote get-url --push origin`;
  const parsedUrl = z
    .string()
    .trim()
    .min(1)
    .regex(/^[^\r\n\0]+$/)
    .safeParse(result.stdout);
  if (result.exitCode !== 0 || !parsedUrl.success) {
    throw new Error(
      "Could not resolve Git's push URL for origin. Check the local Git remote configuration and try again.",
    );
  }

  return parsedUrl.data;
};

const readGitCredential = async (
  pushUrl: string,
): Promise<string | undefined> => {
  const headers = await $(
    gitOptions,
  )`git config --get-urlmatch http.extraHeader ${pushUrl}`;
  const hasNoHeaders =
    headers.exitCode === 1 && headers.stdout === "" && headers.stderr === "";
  if (headers.exitCode !== 0 && !hasNoHeaders) {
    throw new Error(
      "Could not inspect Git's HTTP authentication configuration. Command output is withheld because it may contain credentials.",
    );
  }
  if (/^authorization\s*:/im.test(headers.stdout)) {
    warnUnverified(
      "Git authenticates through a configured HTTP Authorization header.",
    );
    return undefined;
  }

  // Never retain raw command errors: their output may expose credentials under --verbose.
  const result = await $({
    ...gitOptions,
    input: `url=${pushUrl}\n\n`,
  })`git credential fill`;
  const passwordLine = result.stdout
    .split(/\r?\n/)
    .find((line) => line.startsWith("password="));
  const credential = z
    .string()
    .min(1)
    .safeParse(passwordLine?.slice("password=".length));
  if (result.exitCode !== 0 || !credential.success) {
    throw new Error(
      "No HTTPS Git credential is available non-interactively. Configure your Git credential helper for github.com and try again. If you use GitHub CLI, run `gh auth login --hostname github.com` and `gh auth setup-git --hostname github.com`.",
    );
  }

  return credential.data;
};

const verifyWorkflowScope = async (token: string): Promise<void> => {
  let response: Response;
  try {
    response = await fetch("https://api.github.com/user", {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
      },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    // Authenticated request errors must not expose the credential in their cause chain.
    throw new Error(
      "Could not reach GitHub while checking Git's workflow scope. Check connectivity and try again; credential-bearing request details are withheld.",
    );
  }

  if (!response.ok) {
    throw new Error(
      `GitHub could not verify the HTTPS Git credential (HTTP ${response.status}). Check the credential used by Git, its validity, and any organization authorization requirements.`,
    );
  }

  const scopeHeader = response.headers.get("x-oauth-scopes");
  if (scopeHeader === null) {
    warnUnverified(
      "GitHub did not return OAuth scope metadata. Fine-grained and GitHub App tokens use permissions rather than OAuth scopes.",
    );
    return;
  }

  const scopes = scopeHeader.split(",").map((scope) => scope.trim());
  if (!scopes.includes("workflow")) {
    throw new Error(
      "Git's HTTPS credential lacks the `workflow` scope required to publish .github/workflows files. Update the credential used by Git. If you use GitHub CLI, run `gh auth refresh --hostname github.com --scopes workflow` and `gh auth setup-git --hostname github.com`, then try again. Refreshing gh alone does not update a different Git credential helper.",
    );
  }
};

export const assertGitHubWorkflowAccess = async (): Promise<void> => {
  const pushUrl = await readGitPushUrl();
  if (pushUrl.startsWith("ssh://") || /^[^@/:\s]+@[^/:\s]+:.+$/.test(pushUrl)) {
    getLogger(["dx-cli", "git-auth"]).info(
      "Git uses SSH for origin; the OAuth workflow scope does not apply.",
    );
    return;
  }

  const parsedUrl = z.url().safeParse(pushUrl);
  if (!parsedUrl.success) {
    throw new Error("Git returned an invalid push URL for origin.");
  }
  const url = new URL(parsedUrl.data);
  if (url.origin !== "https://github.com") {
    warnUnverified("Git's effective push URL is not GitHub HTTPS or SSH.");
    return;
  }

  const credential = await readGitCredential(pushUrl);
  if (credential !== undefined) {
    await verifyWorkflowScope(credential);
  }
};
