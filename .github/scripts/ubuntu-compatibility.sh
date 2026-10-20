#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

inventory() {
  local output_dir="${RUNNER_TEMP:?}/ubuntu-compatibility"
  mkdir -p "$output_dir"
  {
    printf 'Commit: %s\nImageOS: %s\nImageVersion: %s\n' \
      "${GITHUB_SHA:?}" "${ImageOS:?}" "${ImageVersion:?}"
    cat /etc/os-release
    uname -m
    uname -r
    getconf GNU_LIBC_VERSION
    node --version
    npm --version
    corepack --version
    python3 --version
    openssl version
    tar --version
    go version
    dotnet --list-sdks
    az version
    aws --version
    docker version
    docker compose version
    helm version --short
  } 2>&1 | tee "$output_dir/inventory.txt"
  {
    printf '## Hosted image\n\n'
    printf 'Commit: %s; image: %s (%s).\n\n' "$GITHUB_SHA" "$ImageOS" "$ImageVersion"
    printf 'Scope: cold Node bootstrap, TLS/CSR/PFX, and synthetic plan encryption.\n'
    printf 'No Azure/ACME calls, deployments, consumer builds, or external-runtime certification.\n'
  } >> "${GITHUB_STEP_SUMMARY:?}"
}

bootstrap() {
  corepack enable
  local expected_pnpm
  expected_pnpm="$(node -p 'require(process.argv[1]).packageManager.split("@")[1].split("+")[0]' "$repo_root/package.json")"
  test "$(pnpm --version)" = "$expected_pnpm"
  test "$(corepack yarn@1.22.22 --version)" = 1.22.22
  printf 'PASS: Corepack, pnpm %s, and Yarn 1.22.22 with ambient Node %s\n' \
    "$expected_pnpm" "$(node --version)"
}

python_version() {
  local version
  version="$(sed -nE 's/^[[:space:]]+python-version: "([0-9]+\.[0-9]+\.[0-9]+)"$/\1/p' \
    "$repo_root/actions/renew-tls-certificate/action.yaml")"
  if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    printf 'Expected exactly one pinned Python version in the TLS action\n' >&2
    return 1
  fi
  printf '%s\n' "$version"
}

pfx() (
  work_dir="$(mktemp -d)"
  trap 'rm -rf "$work_dir"' EXIT
  cd "$work_dir"
  openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout csr.key -out certificate_chain.pem \
    -days 1 -subj '/CN=local-compatibility.invalid'
  openssl pkcs12 -inkey csr.key -in certificate_chain.pem \
    -export -passout pass: -nodes -out certificate_chain.pfx
  openssl pkcs12 -in certificate_chain.pfx -passin pass: \
    -nokeys -out extracted.pem
  openssl x509 -in certificate_chain.pem -outform DER -out original.der
  openssl x509 -in extracted.pem -outform DER -out extracted.der
  cmp original.der extracted.der
  printf 'PASS: PFX certificate round trip\n'
)

plan_fixture() {
  printf 'CES-2352 synthetic plan\000\377\n'
}

encrypt() (
  work_dir="$(mktemp -d)"
  trap 'rm -rf "$work_dir"' EXIT
  output_dir="${RUNNER_TEMP:?}/ubuntu-compatibility"
  mkdir -p "$output_dir"
  plan_fixture > "$work_dir/plan"
  ENCRYPTION_PASSPHRASE=public-compatibility-fixture-not-a-secret \
    openssl enc -aes-256-cbc -salt -pbkdf2 \
    -in "$work_dir/plan" -out "$output_dir/plan.enc" \
    -pass env:ENCRYPTION_PASSPHRASE
)

decrypt() (
  work_dir="$(mktemp -d)"
  trap 'rm -rf "$work_dir"' EXIT
  plan_fixture > "$work_dir/expected"
  for source_os in ubuntu-24.04 ubuntu-26.04; do
    ENCRYPTION_PASSPHRASE=public-compatibility-fixture-not-a-secret \
      openssl enc -aes-256-cbc -d -pbkdf2 \
      -in "${RUNNER_TEMP:?}/ubuntu-compatibility-input/ubuntu-probe-$source_os/plan.enc" \
      -out "$work_dir/decrypted" -pass env:ENCRYPTION_PASSPHRASE
    cmp "$work_dir/expected" "$work_dir/decrypted"
    printf 'PASS: decrypted and byte-compared fixture from %s\n' "$source_os"
  done
)

case "${1:-}" in
  inventory) inventory ;;
  bootstrap) bootstrap ;;
  python-version) python_version ;;
  pfx) pfx ;;
  encrypt) encrypt ;;
  decrypt) decrypt ;;
  *) printf 'Usage: %s {inventory|bootstrap|python-version|pfx|encrypt|decrypt}\n' "$0" >&2; exit 2 ;;
esac
