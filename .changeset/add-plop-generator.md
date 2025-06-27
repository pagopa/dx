---
"@pagopa/typescript-generator": minor
---

Add PlopJS generator for creating TypeScript packages in the DX monorepo

This new package provides a comprehensive generator that creates TypeScript packages with:

- Complete package.json with proper dependencies and scripts
- TypeScript configuration (tsconfig.json)
- Build configuration (tsup.config.ts)
- Linting configuration (eslint.config.js)
- Testing setup (vitest.config.ts and test files)
- Documentation template (README.md)
- Essential project files (.gitignore, .node-version)
- Optional changeset creation

The generator follows all established monorepo conventions and best practices, making it easy to scaffold new packages that are immediately ready for development and deployment.
