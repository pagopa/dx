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
// This plugin is installed across multiple, unrelated repositories, so
// `imageAuthors`/`imageNamePrefix`/`imageUrl` identify *which repository*
// built an image (they end up in OCI labels and in the image name itself).
// There's no safe repo-agnostic default for them: a default would silently
// stamp one consumer's identity (e.g. "pagopa/dx-slc") onto every other
// consumer's images. They're required — every `nx.json` registration must
// set them explicitly. The remaining options are Nx/registry conventions
// that are the same across repos, so they keep sensible defaults.
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

type DefaultableOption =
  | "buildTargetName"
  | "defaultBranch"
  | "jsBuildTargetName"
  | "packageTargetName"
  | "pushTargetName"
  | "registry";

const defaultOptions: Pick<DockerPluginOptions, DefaultableOption> = {
  buildTargetName: "docker:build",
  defaultBranch: "main",
  jsBuildTargetName: "build",
  packageTargetName: "package",
  pushTargetName: "docker:push",
  registry: "ghcr.io",
};

const partialSchema = dockerPluginOptionsSchema.partial({
  buildTargetName: true,
  defaultBranch: true,
  jsBuildTargetName: true,
  packageTargetName: true,
  pushTargetName: true,
  registry: true,
});

export const parseDockerReleasePluginOptions = (
  options: unknown,
): DockerPluginOptions => {
  const input = typeof options === "object" && options !== null ? options : {};
  const parseResult = partialSchema.safeParse(input);
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
