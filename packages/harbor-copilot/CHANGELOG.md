## 0.1.1 (2026-09-08)

### 🚀 Features

- Introduce a new harbor-bench app that provides CLI commands for converting, reporting, and comparing trial metrics, and align the Python packages with the monorepo release conventions (private package.json version manifests, like the Go providers). ([#2155](https://github.com/pagopa/dx/pull/2155))

### 🩹 Fixes

- Bump cryptography from 48.0.1 to 50.0.0 (with msal from 1.35.0 to 1.38.0 to keep the pinned set resolvable) in the renew-tls-certificate action requirements, and setuptools from 80.9.0 to 83.0.0 in the harbor-bench and harbor-copilot Python packages. ([#2157](https://github.com/pagopa/dx/pull/2157))

### ❤️ Thank You

- Danilo Spinelli @gunzip