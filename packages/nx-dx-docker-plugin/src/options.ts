// Plugin option parsing for the docker-release Nx plugin: `@nx/docker`
// remains the official base plugin for the `docker:run` convenience target
// and the `nx-release-publish` executor, while this plugin owns the full
// `docker:build`/`docker:push` target definitions (multi-tag strategy, OCI
// labels, provenance/reproducibility flags) for every project with a
// Dockerfile, plus the `package` target for projects that also have a JS/TS
// build target.
//
// Deliberately OUT of scope (left to the CI workflow, not this plugin):
// registry authentication (`docker login`/OIDC) and artifact attestation —
// both require CI secrets/tokens that an Nx plugin has no business handling.
//
// NOTE: the defaults below are tuned for this plugin's original consumer
// (selfcare-monorepo-poc) and may change; other consumers should pass
// explicit values for every option in their own `nx.json` plugin
// registration instead of relying on these defaults.
import { z } from "zod/v4";

const nonEmptyString = z.string().min(1);

const dockerPluginOptionsSchema = z.object({
  buildTargetName: nonEmptyString,
  defaultBranch: nonEmptyString,
  imageAuthors: nonEmptyString,
  imageNamePrefix: nonEmptyString,
  imageUrl: nonEmptyString,
  jsBuildTargetName: nonEmptyString,
  packageTargetName: nonEmptyString,
  pushTargetName: nonEmptyString,
  registry: nonEmptyString,
});

export type DockerPluginOptions = z.infer<typeof dockerPluginOptionsSchema>;

const defaultOptions: DockerPluginOptions = {
  buildTargetName: "docker:build",
  defaultBranch: "main",
  imageAuthors: "PagoPA S.p.A.",
  imageNamePrefix: "pagopa/dx-slc",
  imageUrl: "https://github.com/pagopa/selfcare-monorepo-poc",
  jsBuildTargetName: "build",
  packageTargetName: "package",
  pushTargetName: "docker:push",
  registry: "ghcr.io",
};

export const parseDockerReleasePluginOptions = (
  options: unknown,
): DockerPluginOptions => {
  const input = typeof options === "object" && options !== null ? options : {};
  const parseResult = dockerPluginOptionsSchema.partial().safeParse(input);
  if (!parseResult.success) {
    const validationErrors = parseResult.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "options";
        return `${path}: ${issue.message}`;
      })
      .join("; ");
    throw new Error(
      `Invalid @pagopa/nx-dx-docker-plugin options: ${validationErrors}`,
    );
  }
  return { ...defaultOptions, ...parseResult.data };
};
