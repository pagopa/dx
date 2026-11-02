/**
 * Mints a magic link for a repository scope.
 *
 * Needs the signing secret in the environment:
 *
 *   export DX_METRICS_SCOPE_SECRET="$(az keyvault secret show \
 *     --vault-name dx-p-itn-common-kv-01 \
 *     --name dx-metrics-scope-secret --query value -o tsv)"
 *
 * The link is deterministic: the same tag set always produces the same URL, so
 * re-running this command is safe. See docs/scoped-access.md.
 */

import { dxMetricsConfig } from "@pagopa/dx-metrics-core/config";

import { resolveScope } from "../src/lib/scope/scope.js";
import {
  SCOPE_TOKEN_VERSION,
  signScopeToken,
  type ScopePayload,
} from "../src/lib/scope/token.js";

const DEFAULT_BASE_URL = "https://metrics.dx.pagopa.it";

interface MintOptions {
  all: boolean;
  baseUrl: string;
  tags: string[];
}

const KNOWN_TAGS = [
  ...new Set(
    dxMetricsConfig.repositories.flatMap((repository) => repository.tags),
  ),
].sort();

const usage = `Usage:
  pnpm --filter dx-metrics scope:link --tags <tag[,tag]> [--base-url <url>]
  pnpm --filter dx-metrics scope:link --all [--base-url <url>]

Known tags: ${KNOWN_TAGS.join(", ")}`;

function fail(message: string): never {
  console.error(`error: ${message}\n\n${usage}`);
  process.exit(1);
}

const splitTags = (value: string): string[] =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

const parseArgs = (argv: readonly string[]): MintOptions => {
  const options: MintOptions = {
    all: false,
    baseUrl: process.env.DX_METRICS_PUBLIC_URL ?? DEFAULT_BASE_URL,
    tags: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--all") {
      options.all = true;
      continue;
    }

    if (argument === "--base-url" || argument === "--tags") {
      const value = argv[index + 1];
      if (value === undefined) {
        fail(`${argument} needs a value`);
      }

      index += 1;
      if (argument === "--tags") {
        options.tags = splitTags(value);
      } else {
        options.baseUrl = value;
      }
      continue;
    }

    fail(`unknown argument "${argument ?? ""}"`);
  }

  if (options.all && options.tags.length > 0) {
    fail("--all and --tags are mutually exclusive");
  }
  if (!options.all && options.tags.length === 0) {
    fail("pass --tags <tag[,tag]> or --all");
  }

  return options;
};

const mint = (options: MintOptions): void => {
  const unknownTags = options.tags.filter((tag) => !KNOWN_TAGS.includes(tag));
  if (unknownTags.length > 0) {
    fail(
      `unknown tag${unknownTags.length === 1 ? "" : "s"}: ${unknownTags.join(", ")}`,
    );
  }

  const payload: ScopePayload = options.all
    ? { all: true, v: SCOPE_TOKEN_VERSION }
    : { tags: options.tags, v: SCOPE_TOKEN_VERSION };

  // Resolves through the same function the portal uses, so this command cannot
  // print a link that the app would reject.
  const scope =
    resolveScope(payload) ??
    fail("the payload does not resolve to any repository");

  const secret = process.env.DX_METRICS_SCOPE_SECRET ?? "";
  if (secret.length === 0) {
    fail("DX_METRICS_SCOPE_SECRET is not set");
  }

  const token = signScopeToken(payload, secret);
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const what = scope.all ? "full portfolio" : scope.tags.join(" + ");

  console.log(`scope: ${what} (${scope.repositories.length} repositories)`);
  console.log(`${baseUrl}/auth/scope?token=${token}`);
};

try {
  mint(parseArgs(process.argv.slice(2)));
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
