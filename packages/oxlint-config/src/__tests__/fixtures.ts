/**
 * Sources linted by `fixture.test.ts`. They live in a string so that the repo
 * linter, which enforces the very rules they violate, leaves them alone.
 */
export const TYPESCRIPT_FIXTURE = `import { beta, alpha } from "./lib.ts";

import zlib from "node:zlib";

const zeta = zlib;
const gamma = alpha;

type Shape = {
  width: number;
  height: number;
};

interface Point {
  y: number;
  x: number;
}

type Kind = "square" | "circle" | "triangle";

type Named = {
  name: string;
};

type Both = { size: number } & Named;

const width = 123;

export type Width = typeof width;

export const config = {
  zeta,
  gamma,
  beta,
};

export const order = ["charlie", "alpha", "bravo"];

export const flags = new Map([
  ["zeta", true],
  ["alpha", true],
]);

export const ids = new Set(["zulu", "alpha"]);

const delta = 1,
  charlie = 2;

const isBig = ["echo", "delta"].includes("echo");

class Shape2 {
  static create(): Shape2 {
    return new Shape2();
  }

  read = 1;

  write(): void {
    this.read = 2;
  }
}

enum Size {
  Small = "small",
  Large = "large",
}

interface Dimension {
  height: number;
}

class Box implements Point, Dimension {
  y = 0;

  x = 0;

  height = 0;
}

export function compute(): number {
  const value = { zeta, gamma, beta, charlie, delta };

  return isBig ? gamma + value.delta : gamma;
}

export function label(kind: Kind): string {
  switch (kind) {
    case "triangle":
      return "t";
    case "circle":
      return "c";
    case "square":
      return "s";
    default:
      return "?";
  }
}

export { config as settings, compute as run };

export * from "./z.ts";
export * from "./a.ts";
`;

export const TSX_FIXTURE = `function first(): ClassDecorator {
  return () => undefined;
}

function second(): ClassDecorator {
  return () => undefined;
}

@second()
@first()
export class Decorated {}

export function Widget({ size, color }: { color: string; size: number }) {
  return (
    <div title={color} aria-label={String(size)}>
      {size}
    </div>
  );
}
`;

/**
 * Exercises the rules `@pagopa/eslint-config` enables on plain JavaScript
 * only: TypeScript files turn `no-const-assign` off and add
 * `prefer-rest-params`, so this fixture proves the override is scoped.
 */
export const JAVASCRIPT_FIXTURE = `export const read = function () {
  const total = 1;
  total = 2;
  return [total, Array.from(arguments)];
};
`;

/**
 * Exercises the Vitest overlay: `no-empty-function` is turned off for test
 * files and the `vitest/*` rules take over, so this fixture proves the
 * override applies at runtime instead of only existing in the config.
 */
export const VITEST_FIXTURE = `import { it, describe, expect } from "vitest";

describe("sum", () => {
  it("adds numbers", () => {
    expect(1 + 1).toBe(2);
  });

  it("adds numbers", () => {
    expect(1 + 1).toBe(2);
  });

  it("adds numbers", () => {});
});
`;
