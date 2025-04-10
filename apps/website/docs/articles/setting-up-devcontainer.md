---
sidebar_label: Setting up Development Containers
---

# Setting up Development Containers

## What are Development Containers?

> A development container (or dev container for short) allows you to use a
> container as a full-featured development environment. It can be used to run an
> application, to separate tools, libraries, or runtimes needed for working with
> a codebase, and to aid in continuous integration and testing. Dev containers
> can be run locally or remotely, in a private or public cloud, in a variety of
> supporting tools and editors.
>
> — [What are development Containers?](https://containers.dev/)

Development Containers are useful for setting up a consistent development
environment across different machines and sharing it with your team. They can
even be used in your CI/CD pipeline to ensure that your code is built and tested
in the same environment.

## Prerequisites

You need to have docker installed on your machine. If you are on macOS or
Windows, you can install [Rancher Desktop](https://rancherdesktop.io/), which
includes all the tools you need to run `docker` on your machine.

:::tip Recommended configuration for Rancher Desktop on macOS

To achieve the best performance, we recommend using `VZ` as the default _Virtual
Machine Type_ and `virtiofs` as the default _File Sharing_ method.

:::

To build and run development containers, you need to have a
[Supporting Tool](https://containers.dev/supporting) installed on your machine.
A supporting tool is a tool that can be used to build and run development
containers. It can be a text editor, an IDE, a terminal, or a web-based tool.

This guide will show you how to set up and use development containers with two
different supporting tools: **Visual Studio Code** and the **Dev Container
CLI**.

#### Visual Studio Code

If you are using Visual Studio Code, you have to install the
[Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
extension, which is the official extension to work with development containers.

#### Dev Container CLI

If you are not using Visual Studio Code, you can still use development
containers from your terminal using the `devcontainer` command line tool. You
can install it using the following commands:

```bash
npm install -g @devcontainers/cli
# Check if the installation was successful
devcontainer --version
```

## Create your first Development Container

The core of a development container is a `devcontainer.json` file. This file
contains the configuration of the development container, such as the base image,
the features to install, the post-start command, and customizations.

To start, create a `devcontainer.json` file in the root in `.devcontainer`
directory of your project.

```js title=".devcontainer/devcontainer.json"
{
  "name": "My Development Container",
  "image": "mcr.microsoft.com/devcontainers/base:debian"
}
```

This file defines a development container named `My Development Container` based
on the `mcr.microsoft.com/devcontainers/base:debian` image.

#### Start the Development Container

##### Visual Studio Code

1. Open the command palette (`Cmd + Shift + P` on macOS or `Ctrl + Shift + P` on
   Windows/Linux).
2. Search for `Dev Containers: Reopen in Container`.

Visual Studio Code will build the development container and open a new window
inside the container.

##### Dev Container CLI

1. Open a terminal in the root of your project.
2. Run the following command:

```bash
# build and start the development container
devcontainer up --workspace-folder .
# open a shell inside the container
devcontainer exec --workspace-folder . /bin/bash
```

The `--workspace-folder` flag is used to specify the path to the folder that
contains the `.devcontainer` directory.

### Adding the Node.js Feature

Once you have created the development container, you can add features to it.
Features are pre-built configurations that can be added to a development
container to install tools, libraries, or runtimes.

Let's install the Node.js feature to the development container. This feature
will install `node`, `npm` and `yarn` at the specified version.

```js title=".devcontainer/devcontainer.json"
{
  "name": "My Development Container",
  "image": "mcr.microsoft.com/devcontainers/base:debian",
  // highlight-start
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "20.19.0"
    }
  }
  // highlight-end
}
```

You can find a list of available features, official and community, in the
[Dev Container Features](https://containers.dev/features) page. Each feature has
its own documentation that explains how to use it, check out the
[Node.js feature documentation here](https://github.com/devcontainers/features/tree/main/src/node)
to learn more about it.

##### Test the Node.js Feature

Rebuild the development container and open a shell inside it. You can check if
`node`, `npm`, and `yarn` are installed and at the correct version.

```bash
node --version
# v20.19.0
npm --version
yarn --version
```

:::tip How to rebuild a development container? In Visual Studio Code you can
rebuild the development container by running the
`Dev Containers: Rebuild Container` command from the command palette. In the
terminal, you can run the `devcontainer up --workspace-folder .` command. :::

### Execute `yarn install` on start

Once you have `node` installed you may also want to run `yarn install` when the
development container starts.

You can do this by adding a `postStartCommand` to the `devcontainer.json` file.

```js title=".devcontainer/devcontainer.json"
{
  "name": "My Development Container",
  "image": "mcr.microsoft.com/devcontainers/base:debian",
  // highlight-next-line
  "postStartCommand": "yarn install",
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "20.19.0"
    }
  }
}
```

You can also run multiple commands by passing an object to `postStartCommand`.
These commands will be executed in parallel.

```js title=".devcontainer/devcontainer.json"
{
  "name": "My Development Container",
  "image": "mcr.microsoft.com/devcontainers/base:debian",
  // highlight-start
  "postStartCommand": {
    "yarn-install": "yarn install",
    "greet": "echo 'Hello, from the development container!'"
  },
  // highlight-end
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "20.19.0"
    }
  }
}
```

The development containers also support other lifecycle hooks like
`preStartCommand`, `postStartCommand`, `preStopCommand`, and `postStopCommand`.
You can learn more about them in the
[Dev Container Lifecycle Hooks](https://containers.dev/implementors/spec/#lifecycle)
page.

### Customize the Development Container

You can customize the development container by adding customizations to the
`devcontainer.json` file. Customizations can be applied to the editor, the
terminal, the shell, and the environment variables.

One typical customization is to set up extensions and settings for Visual Studio
Code. Let's configure the `prettier` extension and set it as the default
formatter.

```js title=".devcontainer/devcontainer.json"
{
  "name": "My Development Container",
  "image": "mcr.microsoft.com/devcontainers/base:debian",
  "postStartCommand": "yarn install",
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "20.19.0"
    }
  },
  // highlight-start
  "customizations": {
    "vscode": {
      "extensions": [
        "esbenp.prettier-vscode"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode"
      }
    }
  }
  // highlight-end
}
```

Customizations are a great way to centralize the configuration of your
development environment and share it with your team. You can learn more about
customizations in the [Supporting Tool](https://containers.dev/supporting) page.

:::tip Did you know? Some features includes customizations that are
automatically applied to the development container. For example the
[Official Terraform Feature](https://github.com/devcontainers/features/tree/main/src/terraform)
automatically installs the `hashicorp.terraform` VSC extension and sets up the
`terraform` language server. :::

### Use a `Dockerfile` instead of a prebuilt image

Sometimes you may want to use a custom Dockerfile to build the development
container instead of using a prebuilt image. You can do this by adding a `build`
object to the `devcontainer.json` file.

Let's create a custom Dockerfile that adds an alias for `yarn` and use it to
build the development container.

1. Create a `Dockerfile` in the `.devcontainer` directory:

   ```docker title=".devcontainer/Dockerfile"
   FROM mcr.microsoft.com/devcontainers/base:debian

   # Add yarn alias
   RUN echo 'alias y="yarn"' >> /etc/bash.bashrc

   CMD ["sleep", "infinity"]
   ```

2. Update the `devcontainer.json` file to use the `Dockerfile`:

   ```js title=".devcontainer/devcontainer.json"
   {
     "name": "My Development Container",
     // highlight-start
     "build": {
       "dockerfile": "Dockerfile"
     },
     // highlight-end
     "postStartCommand": "yarn install",
     "features": {
       "ghcr.io/devcontainers/features/node:1": {
         "version": "20.19.0"
       }
     },
     "customizations": {
       "vscode": {
         "extensions": [
           "esbenp.prettier-vscode"
         ],
         "settings": {
           "editor.formatOnSave": true,
           "editor.defaultFormatter": "esbenp.prettier-vscode"
         }
       }
     }
   }
   ```

3. Once you have updated the `devcontainer.json` file, you can rebuild the
   development container and open a shell inside it to test the newly added `y`
   alias.

:::tip Docker Compose If you need to run multiple containers alongside the
development container, you can use **Docker Compose** to define the services
that should be started with the development container. This is useful when you
need to run backing services like databases, caches, or message brokers
alongside the development container.

A real-world example of this setup can be found in the
[pagopa/io-messages GitHub repository](https://github.com/pagopa/io-messages/blob/main/.devcontainer/devcontainer.json)
where the development container is started alongside a `redis`, `azurite` and
other services using Docker Compose. :::

### Extra: Use a Development Container Template

You don't have to start from scratch when creating a development container. You
can use a [template](https://containers.dev/templates) to create a development
container with pre-built configurations.

The PagoPA DX team maintain a
[Node.js template](https://github.com/pagopa/dx/tree/main/.devcontainer/templates/node)
that you can use to create a development container for a Node.js project, that
follow the best practices and conventions listed in our Tech Radar.

Since it is not published yet in the official registry, you need the **Dev
Container CLI** to use it. To use it follow these steps:

```bash
cd path/to/your/project
devcontainer templates apply -t ghcr.io/pagopa/devcontainer-templates/node:1
```

This will scaffold a `devcontainer.json` ready to work with `node`, `terraform`,
`azure` and the other tools we use in our projects.

:::tip PagoPA's features and templates The DX team is working to develop custom
features and templates that are not available in the official registry. You can
find them in the
[pagopa/dx GitHub repository](https://github.com/pagopa/dx/tree/main/.devcontainer).
:::

### Conclusion

You now know the basics of setting up a development container. Check out the
official [Dev Containers documentation](https://containers.dev) to learn more
about the features and customizations that you can add to your development
container to fit the need of your project.

#### Useful Links

- https://code.visualstudio.com/docs/devcontainers/containers
- https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/adding-a-dev-container-configuration/introduction-to-dev-containers
