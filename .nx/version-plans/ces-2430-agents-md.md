---
"@pagopa/dx-cli": minor
---

Ship an `AGENTS.md` in the monorepo scaffold so AI agents find the toolchain, the validation commands and the repository conventions at the repository root. The file points at the `github-conventions` skill and the DX plugins enabled in `.github/copilot/settings.json` instead of duplicating their content, and leaves the Nx-owned section to `nx init`.
