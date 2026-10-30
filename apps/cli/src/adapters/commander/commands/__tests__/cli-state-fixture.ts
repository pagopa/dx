/**
 * Real Commander/Plop/presenter harness with HTTP and executable system boundaries.
 */
import { Command } from "commander";
import { okAsync } from "neverthrow";
import path from "node:path";
import { Octokit } from "octokit";
import { vi } from "vitest";

import { OctokitGitHubService } from "../../../octokit/index.js";
import { makeAzureAuthorizationService } from "../../../pagopa-technology/azure-authorization.js";
import { createStateFixture } from "../../../terraform/__tests__/state-fixture.js";
import { makeAddCommand } from "../add.js";
import { makeInitCommand } from "../init.js";

export const createCliStateFixture = async () => {
  const fixture = await createStateFixture();
  let cwd = fixture.root;
  const stdout: string[] = [];
  const stderr: string[] = [];
  const consoleOutput: string[] = [];
  const routes = new Map<
    string,
    (request: Request) => Promise<Response> | Response
  >([
    [
      "GET https://api.github.com/repos/antonbabenko/pre-commit-terraform/releases/latest",
      () => Response.json({ tag_name: "v1.100.0" }),
    ],
    [
      "GET https://api.github.com/repos/hashicorp/terraform/releases/latest",
      () => Response.json({ tag_name: "v1.16.0" }),
    ],
    [
      "GET https://api.github.com/repos/pagopa/test-repo",
      () => Response.json({ message: "Not Found" }, { status: 404 }),
    ],
    [
      "GET https://nodejs.org/dist/index.json",
      () => Response.json([{ lts: "Krypton", version: "v24.0.0" }]),
    ],
    [
      "GET https://npm.pkg.github.com/%40pagopa%2Fnx-terraform",
      () => Response.json({ name: "@pagopa/nx-terraform" }),
    ],
    [
      "POST https://api.github.com/repos/pagopa/test-repo/pulls",
      () =>
        Response.json(
          { html_url: "https://github.com/pagopa/test-repo/pull/1" },
          { status: 201 },
        ),
    ],
  ]);
  for (const environment of ["bootstrapper-dev-cd", "bootstrapper-dev-ci"]) {
    const base = `https://api.github.com/repos/pagopa/test-repo/environments/${environment}`;
    routes.set(`PUT ${base}`, () => Response.json({ name: environment }));
    routes.set(`GET ${base}/secrets/public-key`, () =>
      Response.json({
        // RFC 7748 public test vector; no real credentials are used.
        key: Buffer.from(
          "de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f",
          "hex",
        ).toString("base64"),
        key_id: "fixture-public-key",
      }),
    );
    for (const secret of [
      "ARM_CLIENT_ID",
      "ARM_SUBSCRIPTION_ID",
      "ARM_TENANT_ID",
      "GH_APP_CLIENT_ID",
      "GH_APP_ID",
      "GH_APP_INSTALLATION_ID",
      "GH_APP_KEY",
    ]) {
      routes.set(
        `PUT ${base}/secrets/${secret}`,
        () => new Response(null, { status: 204 }),
      );
    }
  }
  vi.spyOn(process, "cwd").mockImplementation(() => cwd);
  vi.spyOn(process, "chdir").mockImplementation((directory: string) => {
    cwd = path.resolve(cwd, directory);
  });
  vi.spyOn(process.stdout, "write").mockImplementation((data: unknown) => {
    stdout.push(String(data));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((data: unknown) => {
    stderr.push(String(data));
    return true;
  });
  vi.spyOn(console, "log").mockImplementation((...values: unknown[]) => {
    consoleOutput.push(values.map(String).join(" "));
  });
  vi.stubGlobal(
    "fetch",
    async (input: Request | string | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      const handler = routes.get(
        `${request.method} ${url.origin}${url.pathname}`,
      );
      if (!handler) {
        throw new Error(
          `Unexpected fixture HTTP request: ${request.method} ${request.url}`,
        );
      }
      return handler(request);
    },
  );
  const gitHubService = new OctokitGitHubService(
    new Octokit({
      auth: "fixture-token",
      request: { fetch: globalThis.fetch },
      retry: { enabled: false },
      throttle: { enabled: false },
    }),
  );
  const authenticate = () =>
    okAsync({
      authorizationService: makeAzureAuthorizationService(gitHubService),
      gitHubService,
    });
  vi.stubEnv("GITHUB_TOKEN", "fixture-token");
  return {
    ...fixture,
    consoleOutput,
    dispose: async () => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
      process.exitCode = undefined;
      await fixture.dispose();
    },
    program: (mode = "json", ci = true) =>
      new Command()
        .exitOverride()
        .option("--output <mode>", "Output mode", mode)
        .addCommand(makeInitCommand(authenticate, { CI: ci }))
        .addCommand(makeAddCommand(authenticate, { CI: ci })),
    routes,
    stderr,
    stdout,
    useExistingRepository: () =>
      routes.set("GET https://api.github.com/repos/pagopa/test-repo", () =>
        Response.json({
          id: 1001,
          name: "test-repo",
          owner: { id: 2001, login: "pagopa" },
        }),
      ),
  };
};
