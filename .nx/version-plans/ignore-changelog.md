---
'@pagopa/opex-dashboard': patch
'dx-metrics': patch
'@pagopa/dx-mcpserver': patch
'docs': patch
'@pagopa/dx-cli': patch
'@pagopa/eslint-config': patch
'@pagopa/dx-mcpprompts': patch
'@pagopa-dx/terraform-plan-storage-download': patch
'@pagopa-dx/terraform-plan-storage-upload': patch
'setup-telemetry-action': patch
'nx-release': patch
'pr-comment-action': patch
---

Ignore CHANGELOG.md files in Prettier formatting

- Add CHANGELOG.md to root .prettierignore
- Add CHANGELOG.md to all project-level .prettierignore files
- Prevents format and format:check scripts from checking/formatting auto-generated changelog files
