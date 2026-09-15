---
title: "mise"
ring: adopt
tags: [tool, nodejs, devops]
---

[mise](https://mise.jdx.dev/) (formerly `rtx`) is a polyglot tool version
manager that installs and switches between multiple runtime versions, such as
Node.js, Python, Go, Java, and Terraform, declaratively and per project. It is
an [asdf](https://asdf-vm.com/) compatible alternative to tools like
[nodenv](https://github.com/nodenv/nodenv) and
[nvm](https://github.com/nvm-sh/nvm), written in Rust, so it is significantly
faster. Versions are declared in a `mise.toml` file that lives in the
repository, making the development environment reproducible and shared across
the team without extra plugins.

## Use cases

- Pin the required versions of runtimes and tools per project with a single
  committed `mise.toml` file, instead of tool-specific files such as
  `.node-version`, `.python-version`, or `.terraform-version`
- Automatically install the right tool versions when entering a project
  directory, avoiding "works on my machine" issues
- Use it in CI pipelines to provision the exact toolchain used locally
- Run project tasks through its built-in task runner

## Reference of usage in our organization

- https://github.com/search?q=org%3Apagopa+mise.toml&type=code
