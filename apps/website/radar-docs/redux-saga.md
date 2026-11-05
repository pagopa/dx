---
title: "Redux Saga"
ring: hold
tags: [mobile, react, react-native, library]
---

[Redux Saga](https://redux-saga.js.org/) is a middleware library for
[Redux](https://redux.js.org/) that manages side effects through generator
functions. Sagas listen for actions to orchestrate asynchronous operations. The
effects available in Redux Saga enable workflows with parallel execution,
retries, and cancellation.

## Why we put Redux Saga on hold

We are seeking alternatives to [Redux Saga](https://redux-saga.js.org/). The
typing of yielded values is limited, which makes asynchronous flows harder to
type safely and maintain. Generator functions also add complexity and can lead
to side effects being implemented with Redux Saga instead of more
straightforward approaches.

## Use cases

- Handle asynchronous side effects triggered by Redux actions.
- Coordinate complex asynchronous workflows.

## Reference of usage in our organization

[io-app](https://github.com/pagopa/io-app)
