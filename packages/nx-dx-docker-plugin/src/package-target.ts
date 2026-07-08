// Builds the `package` Nx target for RFC-DX-076's "monorepo context"
// approach: the Docker build context stays the monorepo root and the whole
// build (install, compile, package) runs inside the Dockerfile's builder
// stage. Nx's job here is limited to exposing a single, uniform task
// (`nx package <project>`) that the Dockerfile can call once it has copied
// the workspace in, instead of every project's Dockerfile re-implementing
// its own dependency pruning logic.
import type { TargetConfiguration } from "@nx/devkit";

export const buildPackageTarget = (
  projectRoot: string,
  projectName: string,
  jsBuildTargetName: string,
): TargetConfiguration => ({
  command: `rm -rf ${projectRoot}/deploy && pnpm --filter ${projectName} deploy --legacy --prod ${projectRoot}/deploy`,
  dependsOn: [jsBuildTargetName],
  metadata: {
    description:
      "Materialize the production-only payload consumed by this project's Dockerfile (RFC-DX-076)",
    technologies: ["docker"],
  },
});
