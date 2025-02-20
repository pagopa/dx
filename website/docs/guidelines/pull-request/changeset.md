---
sidebar_label: Changeset
sidebar_position: 2
---

# Changeset

This document provides guidelines on how to create and manage changesets, which are used to document and track changes in the codebase. Proper use of changesets ensures that all modifications are recorded systematically, facilitating easier tracking and auditing of changes over time.

 ## Breaking Changes

In cases where the code added in a PR breaks backward compatibility, a migration path or guide must be included in the changeset with `major` update. This ensures that users can transition smoothly to the new version without disruption.

### Example

```markdown
---
"dx-website": major
---

Upgrade to Turbo 2.x

## Migration guide
First, check the [official documentation](https://turbo.build/repo/docs/crafting-your-repository/upgrading) for any doubts.

- Run `yarn dlx @turbo/codemod migrate` or `npx @turbo/codemod migrate` (official tool that should help to migrate. Follow the wizard)
   - This will update the `turbo.json` file and try to install the latest version of `turbo`
     - In case of errors, you can manually update the `turbo.json` file [following these steps](https://turbo.build/repo/docs/reference/turbo-codemod#turborepo-2x)
     - In case it wasn't possible to install `turbo`, try to do it manually:
       - `yarn add -D turbo`
     - Now you should be ready to use the latest version of `turbo`
 - Eventually, update the workflow pointing to a specific SHA
```
