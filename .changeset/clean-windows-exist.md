---
"@pagopa/azure-tracing": patch
---

Add compatibility with old `moduleResolution` systems

> [!NOTE]: When a consumer with `moduleResolution: node` tries to import `@pagopa/azure-tracing`, TypeScript fails to find the exported subpath.
> Now, the subpaths are properly exported in the `package.json` file, and, for old systems (like `node`), this packages works as well thanks to the 
> `typesVersions` entry.
> 
> Even though this change guarantees compatibility with old systems, it is recommended to use a more recent `moduleResolution` system, like `bundler`.  
> Reference: https://www.typescriptlang.org/docs/handbook/modules/theory.html#module-resolution-is-host-defined.
