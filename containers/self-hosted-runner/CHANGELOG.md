## 0.0.8 (2026-08-27)

### 🩹 Fixes

- Install libatomic in the runner image for pnpm compatibility. ([#2092](https://github.com/pagopa/dx/pull/2092))

### ❤️ Thank You

- Christian Calabrese

## 0.0.7 (2026-08-26)

### 🩹 Fixes

- Make mise user directories writable. Install `aws-cli`, `az-cli`, and `zip` through mise, and pin the upstream runner version and digest for automated updates. ([#2048](https://github.com/pagopa/dx/pull/2048))

### ❤️ Thank You

- Christian Calabrese
- Copilot App @Copilot

## 0.0.6 (2026-08-05)

### 🩹 Fixes

- Support GitHub App authentication in the runner entrypoint. ([#2039](https://github.com/pagopa/dx/pull/2039))

### ❤️ Thank You

- Christian Calabrese
- Copilot App @Copilot

## 0.0.5 (2026-08-04)

### 🩹 Fixes

- Mark self-hosted-runner as public to publish the Docker image in release pipeline. ([#2036](https://github.com/pagopa/dx/pull/2036))

### ❤️ Thank You

- Christian Calabrese

## 0.0.4 (2026-08-04)

### 🩹 Fixes

- Add mise to the DX self-hosted runner image and move cloud CLI provisioning to repository mise configurations ([#2032](https://github.com/pagopa/dx/pull/2032))

### ❤️ Thank You

- Christian Calabrese
- Copilot App @Copilot

## 0.0.2

### Patch Changes

- 2db0a80: Fix InvalidDefaultArgInFrom error on docker build
