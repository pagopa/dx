#!/usr/bin/env bash
# Branch-only release authentication diagnostics. Never invoke a publisher.
set -euo pipefail

record() {
  local label="$1"
  shift
  local status=0
  "$@" > "$RUNNER_TEMP/auth-probe.log" 2>&1 || status=$?
  # Never print git config, HTTP headers, npmrc, or credential-helper output.
  printf '%s: exit %s\n' "$label" "$status"
  printf '| %s | %s | %s |\n' "$AUTHENTICATION" "$label" "$status" >> "$GITHUB_STEP_SUMMARY"
}

case "${1:?Expected git-api, nx, or summary}" in
  git-api)
    printf '| Authentication | Probe | Exit code (0 = success) |\n|---|---|---|\n' >> "$GITHUB_STEP_SUMMARY"
    record "git fetch using checkout credentials" git fetch origin main --quiet
    # A nonexistent diagnostic ref tests receive-pack access, not protected-main
    # rules or actual updates. --dry-run sends no ref update.
    record "git push --dry-run using checkout credentials" \
      git push --dry-run origin HEAD:refs/heads/release-token-comparison-auth-probe
    record "source repository API" gh api repos/pagopa/dx --jq .full_name
    record "release PR lookup API" gh api \
      'repos/pagopa/dx/pulls?state=open&base=main&head=pagopa:nx-release/main' --jq length
    record "merged release PR lookup API" gh pr list --repo pagopa/dx \
      --state merged --base main --head nx-release/main --limit 1 --json number
    record "release/tag sync read API" gh api 'repos/pagopa/dx/releases?per_page=1' --jq length
    record "bot identity API" gh api "/users/${APP_SLUG}[bot]" --jq .id
    record "destination repository metadata API (public read is not write authorization)" \
      gh api repos/pagopa-dx/terraform-azurerm-azure-core-infra --jq .full_name
    # This endpoint is installation-token-only, unlike public repository reads.
    record "installation scope contains destination" bash -c \
      'gh api installation/repositories --jq "[.repositories[].full_name] | index(\"pagopa-dx/terraform-azurerm-azure-core-infra\") != null" | grep -qx true'
    record "destination push --dry-run with source token" git \
      -c http.https://github.com/.extraheader= -c credential.helper= \
      -c 'credential.helper=!gh auth git-credential' push --dry-run \
      https://github.com/pagopa-dx/terraform-azurerm-azure-core-infra.git \
      HEAD:refs/heads/release-token-comparison-auth-probe --no-verify
    anonymous="$(mktemp -d "$RUNNER_TEMP/anonymous-git.XXXXXX")"
    git -C "$anonymous" init --quiet
    record "genuinely anonymous HTTPS read" env -u GH_TOKEN -u GITHUB_TOKEN \
      GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 \
      git -C "$anonymous" ls-remote https://github.com/pagopa/dx.git refs/heads/main
    git -C "$anonymous" fetch --quiet --depth=1 "$GITHUB_WORKSPACE" HEAD
    record "genuinely anonymous HTTPS push --dry-run" env -u GH_TOKEN -u GITHUB_TOKEN \
      GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 \
      git -C "$anonymous" -c credential.helper= -c core.askPass= push --dry-run \
      https://github.com/pagopa/dx.git FETCH_HEAD:refs/heads/release-token-comparison-auth-probe \
      --no-verify
    ;;
  destination)
    record "destination installation scope contains destination" bash -c \
      'gh api installation/repositories --jq "[.repositories[].full_name] | index(\"pagopa-dx/terraform-azurerm-azure-core-infra\") != null" | grep -qx true'
    record "destination push --dry-run with destination token" git \
      -c http.https://github.com/.extraheader= -c credential.helper= \
      -c 'credential.helper=!gh auth git-credential' push --dry-run \
      https://github.com/pagopa-dx/terraform-azurerm-azure-core-infra.git \
      HEAD:refs/heads/release-token-comparison-auth-probe --no-verify
    ;;
  nx)
    # createOctokit is the exact helper used by the PR/comment/release scripts.
    record "actual nx-release createOctokit with selected token" node --input-type=module -e \
      'import {createOctokit} from "./actions/nx-release/scripts/dist/shared.js"; const client=createOctokit(); await client.repos.get({owner:"pagopa",repo:"dx"});'
    record "actual nx-release createOctokit without GH_TOKEN" env -u GH_TOKEN -u GITHUB_TOKEN \
      node --input-type=module -e \
      'import {createOctokit} from "./actions/nx-release/scripts/dist/shared.js"; createOctokit();'
    record "actual release project selection helper" env target=nx-release-publish \
      node actions/nx-release/scripts/dist/select-projects-with-target.js
    # Only version/changelog dry-run. --skip-publish prevents ANY executor from
    # running; notably Terraform's publisher does not honor NX_DRY_RUN.
    record "Nx version/changelog dry-run (publish disabled)" pnpm nx release \
      --projects=@pagopa/eslint-config --specifier=patch --skip-publish --dry-run --yes
    ;;
  summary)
    {
      printf '\n| Action (%s) | Outcome |\n|---|---|\n' "$AUTHENTICATION"
      printf '| npm registry / workflow token | %s |\n' "$REGISTRY"
      printf '| npm registry / omitted token | %s |\n' "$REGISTRY_MISSING"
      printf '| dependency installation | %s |\n' "$INSTALL"
      printf '| bot identity / selected token | %s |\n' "$IDENTITY"
      printf '| GHCR login / workflow token | %s |\n' "$GHCR"
      printf '| GHCR login / omitted password | %s |\n' "$GHCR_MISSING"
      printf '\nOmitted checkout token means github.token, not anonymous checkout. No-persist still authenticates the checkout itself.\n'
      printf '\nNot executed: PR/comment mutations, git tag creation/push, GitHub releases, npm/container publication, Terraform publisher/repository creation. These have no complete end-to-end dry-run in nx-release; calling the action itself would be unsafe. Nx is invoked with --skip-publish as well as --dry-run.\n'
      printf '\nGit push --dry-run probes authentication/receive-pack access only; it does not prove protected-branch writes or event triggering. Package permissions are deliberately read-only; no OIDC permission or protected release environment is used.\n'
    } >> "$GITHUB_STEP_SUMMARY"
    ;;
  *)
    echo "::error::Unknown diagnostic phase: $1" >&2
    exit 1
    ;;
esac
