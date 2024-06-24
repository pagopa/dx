# We use a single monorepo folder

Date: 2024-03-08

## Status

Accepted

## Context

We will create a template for the monorepo structure as well as templates for
each workspace. We need to agree on a template structure that gives good
ergonomics to users to selectively adopt or update a template while giving us a
lean and solid development context.

## Decision

We will develop the monorepo structure template and all the workspace templates
in the same folder (nominally: `/templates/monorepo`). The result will be a
monorepo application containing all the supported workspaces in one place.

Users will use templates by selectively copying the folders they need. In the
next future, we will provide scripts that will handle this operation
automatically, ensuring consistency in cross-workspace dependency and applying
_codemods_ to enhance and promote continous upgrade of the codebase.

#### Example

For the foreseable future we will structure the project as following example:

```
templates/
├─ monorepo/
│  ├─ apps/
│  │  ├─ react-app/
│  │  ├─ node-app/
│  ├─ packages/
│  │  ├─ react-package/
├─ scripts/
│  ├─ generate-monorepo.sh
│  ├─ generate-node-app.sh
│  ├─ generate-react-package.sh
```

In the example above, the script `generate-monorepo.sh` will copy all the files
and folders needed for an empty monorepo; at the same time
`generate-node-app.sh` will copy into an existing monorepo the folders
`/apps/node-app` and `/configs/typescript-config-node`, and so on.

The scripting mechanism is yet to be decided. We aim to find a community-adopted
tool in order not to _reinvent the wheel_. Having said that, we will go for the
simplest implementation for now so as not to have a premature optimization on
this task.

## Consequences

By having a single project to maintain we achieve:

- less things to manage as code is less;
- when developing a workspace, we can _natively_ prove it fits in the overall
  monorepo structure and configuration;
- when developing on the monorepo structure, we can _natively_ prove it does not
  break the containing workspaces;
- we can easily write integration tests between different workspace templates.

The choice introduces some contraints, too:

- workspaces will always be developed to support the latest monorepo structure;
  that implies that adding a new workspace to an existing monorepo may require
  the user to upgrade the monorepo itself and eventually the other workspaces;
- workspaces are never developed to be standalone, even if they will be deployed
  as standalone artifacts; that will require discipline from us to never
  accidentally refer any resource external to the workspace.
