# Ubuntu hosted runners

DX workflows use explicit Ubuntu versions instead of `ubuntu-latest`. The default
hosted image is **Ubuntu 26.04**. Jobs requiring additional compatibility evidence
are temporarily pinned to **Ubuntu 24.04**, with a reason next to `runs-on`.
Self-hosted labels, `use_private_agent`, `use_labels`, and `override_labels` retain
their existing behavior; only the hosted fallback changes.

An OS label does not freeze the installed tools: GitHub updates each image
regularly. Select application runtimes through `.node-version`, `go.mod`,
`.terraform-version`, or `mise.toml` rather than relying on ambient defaults.

## Temporary Ubuntu 24.04 exceptions

These holds are unverified contracts, not evidence that Ubuntu 26.04 is
intrinsically incompatible.

| Workflow                               | Jobs held on 24.04               | Evidence required to migrate                                                                                                             |
| -------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `release-azure-appsvc-v1.yaml`         | `build`                          | Run the produced native dependencies and Next standalone artifacts on the destination Azure runtime.                                     |
| `web_app_deploy.yaml`                  | `build`                          | Validate consumer artifacts on Azure, including native dependencies and the pre-setup prune command.                                     |
| `function_app_deploy.yaml`             | `build`                          | Validate consumer artifacts on Azure, including native dependencies and the pre-setup prune command.                                     |
| `legacy_deploy_pipelines.yaml`         | `build`                          | Validate the Node/.NET artifact on the destination runtime.                                                                              |
| `release-terraform-legacy-v1.yaml`     | Hosted `tf_plan`, `tf_apply`     | Exercise supported consumers' `terraform.sh` scripts with their pinned Terraform versions.                                               |
| `legacy_publish_sdk.yaml`              | `build`, hosted `deploy`         | Select the intended Node/npm runtime before generation and publishing, then validate supported consumer generators.                      |
| `_validate-next-bundle.yaml`           | `test-next-bundle`               | Validate every Next.js/package-manager combination, including scaffolding before Node setup; do not treat `continue-on-error` as a pass. |
| `release-certificate-v1.yaml`          | `renew-certificate`              | Complete a forced Azure DNS/ACME/Key Vault renewal on 26.04 in UAT.                                                                      |
| `_cron-renew-tls-certificate-e2e.yaml` | `renew-tls-certificate-e2e-test` | Retain the existing UAT baseline until a controlled 26.04 renewal is approved and succeeds.                                              |

Deployment and approval jobs are not held on 24.04 solely because a separate build
job produces native artifacts. Those jobs consume the artifact, not its native
runtime dependencies.

## Compatibility checks

The credential-free `_validate-ubuntu-compatibility.yaml` workflow runs the same
commit on both hosted images. It runs automatically for relevant pull requests
and can also be started with `workflow_dispatch`.

It records the actual image versions and tool inventory and checks:

- Corepack before selecting project Node, pnpm, and an isolated legacy Yarn.
- Project runtime selection and dependency installation without restored caches.
- Provider unit tests with CGO disabled and Terraform CLI setup.
- GNU tar, zip/unzip, and a local Docker Buildx build/export without a registry push.
- Python 3.12.15, hash-locked TLS dependencies, imports, and CSR generation.
- PFX conversion and synthetic encrypted-plan interoperability in both directions.

Nx output caching is explicitly bypassed in this comparison. The regular hosted
Nx caches include the OS label, architecture, and tool-version file hashes;
Turbo caches include the image family, architecture, and selected Node version.
Restore prefixes retain those boundaries, preventing 24.04 build outputs from
being reused on 26.04.

The initial hosted comparison passed on both images in
[run 39423934304](https://github.com/pagopa/dx/actions/runs/39423934304), covering
Node, TLS, PFX, and encrypted-plan interoperability. Consult the pull request's
latest checks for the expanded provider, archive, Docker, and Terraform coverage.

These checks do **not** execute cloud deployments, ACME requests, SDK publishing,
or every consumer's build. A green comparison is evidence for the exercised
operations, not certification of every workflow. Local Ubuntu containers are
useful preflight environments but are not substitutes for the hosted images.

## Consumer migration and rollback

No workflow inputs change. Consumers pinned to an earlier DX commit keep that
commit's runner selection; consumers using `@main` receive these changes when
merged.

Before removing a temporary hold, run the relevant consumer scenario on both
images with identical action references, runtime versions, and inputs, without
restored build outputs. For cloud scenarios, use approved nonproduction resources.
Record the run and actual image version, then update the job and this catalog
together.

If a consumer-specific regression appears, pin the affected workflow call to the
last known-good DX commit while investigating, or restore 24.04 for the affected
hosted job with a documented reason. Changing `override_labels` is not a hosted
runner override: it belongs to the existing self-hosted selection logic.
