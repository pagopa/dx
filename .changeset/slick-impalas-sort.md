---
"@pagopa/dx-cli": patch
---

Remove `init` command feature flag

Now, if you want to use the `init` command, you don't need to set any feature flag. Just run:

```bash
npx @pagopa/dx-cli init project
```
and follow the interactive prompts to create a new monorepo project.
