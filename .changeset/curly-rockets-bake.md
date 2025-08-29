---
"@pagopa/dx-cli": patch
---

Remove `DependencyName` type.

At the moment we do not need to have a strong type to handle the name of a dependency; a simple string it is enough.
