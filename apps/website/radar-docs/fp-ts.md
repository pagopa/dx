---
title: "fp-ts"
ring: hold
tags: [typescript, library]
---

The [fp-ts](https://gcanti.github.io/fp-ts/) library brings functional
programming concepts to TypeScript. It helped us model errors explicitly,
compose asynchronous flows, and write more declarative business logic.

## Deprecation rationale

After evaluating it thoroughly in real projects, we are now putting fp-ts on
hold. While the library gave us real benefits, we also found important drawbacks
that now outweigh those advantages for our context.

The main showstopper is that fp-ts is no longer actively maintained. This
creates a concrete risk that it may not keep working with future TypeScript
versions, especially with TypeScript >= 6.

On top of that, fp-ts has a steep learning curve and relies on jargon and
abstractions that are not familiar to many developers. This makes onboarding
harder, slows down day-to-day development, and negatively impacts both
productivity and developer experience.
