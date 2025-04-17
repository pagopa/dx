# RFC 0001 - Code generation tool for repository setup

## Context
The current process for creating new repositories and setting up development environments is manual and time-consuming.

Developers often have to repeat the same steps for each new project, copying files from other projects, leading to inconsistencies and potential errors.

## Motivation 
The current process is inefficient and error-prone. Developers spend too much time on setup instead of focusing on development.

## Proposal
We propose to use a code generation tool to automate the setup process for new repositories.

This tool will be integrated into a top-level script, such a custom made command line tool, that will be run when creating a new repository.


### Option 1 - Development Container Templates

Development Container templates are a basic way to scaffold codebases. They have no support for advanced templating (as they support only variable substitution, with no logic), but they are a good way to pack a set of files together and share them.

You can find more about Development Containers Templates in the [official documentation](https://containers.dev/implementors/templates/).

#### Authoring a template

Authoring a template is as simple as creating a folder with a `devcontainer-template.json` file and a set of files to be copied. 

Once created, it must be published to an OCI registry (e.g. GitHub Container Registry, Docker Hub, etc.) to be used. The publishing process can be automated using the [official GitHub Action](https://github.com/devcontainers/action).

[Here is an example of a basic Development Container template, with a couple of variables and only one file included.](https://github.com/pagopa/dx/tree/main/.devcontainer/templates/node).

#### Using a template

Templates can be used ("applied") to a folder using the [Dev Container CLI](https://github.com/devcontainers/cli), that is the official command line tool for working with Development Containers.

As this tool is distributed as an NPM packaged, it can be either installed using a package manager (e.g. `npm install -g @devcontainers/cli`) or executed directly using `npx` (e.g. `npx @devcontainers/cli`) or equivalent.

###### Apply a template

```bash
npx @devcontainers/cli templates apply -t ghcr.io/pagopa/devcontainer-templates/node:1
```

###### Apply a template, specifying arguments

```bash
npx @devcontainers/cli templates apply \ 
    --template-id ghcr.io/pagopa/devcontainer-templates/node:1 \ 
    --template-args '{"nodeVersion": "20"}'
```

### Option 2 - Plop.js

[Plop.js](https://plopjs.com/) is a code generator tool and framework that allows you to create custom generators, with complex logic, dynamic prompts and file manipulation.

It is a Node.js based tool, that can be used as a command line tool or as a library (to be easily embedded in other JavaScript applications). It is also built-in into [Turborepo](https://turbo.build/docs/guides/generating-code), accessible by the `turbo gen` command.

#### Authoring a generator (Plopfile)

A Plop generator is defined in a `plopfile.js` file, that exports a function that receives a `plop` object. The `plop` object is used to define the generators and their prompts.

A simple plopfile can look like this:

```javascript
export default function (plop) {
    // controller generator
    plop.setGenerator('controller', {
        description: 'application controller logic',
        prompts: [{
            type: 'input',
            name: 'name',
            message: 'controller name please'
        }],
        actions: [{
            type: 'add',
            path: 'src/{{name}}.js',
            templateFile: 'plop-templates/controller.hbs'
        }]
    });
};
```

This generator will create a new file in the `src` folder, with the name specified by the user, using the template defined in `plop-templates/controller.hbs` (using [Handlebars](https://handlebarsjs.com/) as templating engine, as the extension suggests).

Plop includes built-in `actions` for adding, modifying and deleting files, as well as for running custom scripts. It also supports custom actions, that can be used to extend the functionality.

#### Using Plop to apply a template 

Applying a template depends by how plop is used. If it is used as a command line tool, it can be run using the `plop` command. If it is used as a library, it can be run using its JavaScript API.

###### Using Plop as a command line tool

```bash
npx plop
# or
npx turbo gen
```

###### Using Plop as a library

https://plopjs.com/documentation/#wrapping-plop

## Comparison

| Feature | Development Container Templates | Plop.js |
|---------|---------------------------------|---------|
| File manipulation | Limited (copy only) | Advanced (add, modify, delete, run custom commands) |
| Templating | Basic (variable substitution only) | Advanced (Handlebars) |
| Authoring | Just a folder published to a registry | Should be distributed via NPM or alongside the consumer |

## Decision

TBD
