---
title: "Yarn Classic (version 1.x)"
ring: hold
tags: [typescript, tool]
---

[Yarn](https://classic.yarnpkg.com/lang/en/) is an open-source package manager
used to manage dependencies in JavaScript projects alternative to npm. We use
it, intead of npm, in our Node, Next and React projects. The classic version is
on hold in favor of newer alternatives like [pnpm](./pnpm.md) that offer better
performance and disk efficiency, and enforce strict dependency boundaries to
avoid "ghost dependencies" issues.

## Use cases

- Manage dependencies in JavaScript projects.
- Run scripts defined in `package.json` file.

## Reference of usage in our organization

A non exhaustive list of our projects that use Yarn:

- [io-backend](http://github.com/pagopa/io-backend)
- [io-app](http://github.com/pagopa/io-app)
- [io-ts-common](http://github.com/pagopa/io-ts-commons)
