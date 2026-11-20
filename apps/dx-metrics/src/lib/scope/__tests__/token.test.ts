import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { signScopeToken, verifyScopeToken } from "../token.js";

const SECRET = "a".repeat(32);
const OTHER_SECRET = "b".repeat(32);

const signRawBody = (body: string, secret: string): string =>
  `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;

const signRawPayload = (payload: unknown, secret: string): string =>
  signRawBody(
    Buffer.from(JSON.stringify(payload), "utf8").toString("base64url"),
    secret,
  );

describe("signScopeToken and verifyScopeToken", () => {
  it("round-trips a tag payload", () => {
    const token = signScopeToken({ tags: ["p4pa"], v: 1 }, SECRET);

    expect(verifyScopeToken(token, SECRET)).toEqual({
      tags: ["p4pa"],
      v: 1,
    });
  });

  it("round-trips the full-portfolio payload", () => {
    const token = signScopeToken({ all: true, v: 1 }, SECRET);

    expect(verifyScopeToken(token, SECRET)).toEqual({ all: true, v: 1 });
  });

  it("is deterministic regardless of tag order, duplicates and padding", () => {
    const token = signScopeToken({ tags: ["one", "pdv", "one"], v: 1 }, SECRET);
    const reordered = signScopeToken({ tags: [" pdv ", "one"], v: 1 }, SECRET);

    expect(reordered).toBe(token);
    expect(verifyScopeToken(token, SECRET)).toEqual({
      tags: ["one", "pdv"],
      v: 1,
    });
  });

  it("rejects a tampered body", () => {
    const token = signScopeToken({ tags: ["p4pa"], v: 1 }, SECRET);
    const [body, signature] = token.split(".");
    const flipped = body.startsWith("A")
      ? `B${body.slice(1)}`
      : `A${body.slice(1)}`;

    expect(verifyScopeToken(`${flipped}.${signature}`, SECRET)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const token = signScopeToken({ tags: ["p4pa"], v: 1 }, SECRET);
    const signature = token.slice(token.indexOf(".") + 1);
    const flipped = signature.startsWith("A")
      ? `B${signature.slice(1)}`
      : `A${signature.slice(1)}`;

    expect(
      verifyScopeToken(
        `${token.slice(0, token.indexOf("."))}.${flipped}`,
        SECRET,
      ),
    ).toBeNull();
  });

  it("rejects a token signed with another secret", () => {
    const token = signScopeToken({ tags: ["p4pa"], v: 1 }, OTHER_SECRET);

    expect(verifyScopeToken(token, SECRET)).toBeNull();
  });

  it.each([
    "",
    "no-separator",
    "two.dots.here",
    ".empty-body",
    "empty-signature.",
  ])("rejects the malformed token %j", (token) => {
    expect(verifyScopeToken(token, SECRET)).toBeNull();
  });

  it("rejects a payload with an unknown version", () => {
    const token = signRawPayload({ tags: ["p4pa"], v: 2 }, SECRET);

    expect(verifyScopeToken(token, SECRET)).toBeNull();
  });

  it("rejects a payload that carries both all and tags", () => {
    const token = signRawPayload({ all: true, tags: ["p4pa"], v: 1 }, SECRET);

    expect(verifyScopeToken(token, SECRET)).toBeNull();
  });

  it("rejects a body that is not JSON", () => {
    const token = signRawBody(
      Buffer.from("not json", "utf8").toString("base64url"),
      SECRET,
    );

    expect(verifyScopeToken(token, SECRET)).toBeNull();
  });

  it("rejects an empty tag set at signing time", () => {
    expect(() => signScopeToken({ tags: [], v: 1 }, SECRET)).toThrow(
      /Invalid scope payload/,
    );
  });

  it("rejects a secret shorter than the minimum", () => {
    expect(() => signScopeToken({ tags: ["p4pa"], v: 1 }, "short")).toThrow(
      /at least 32 characters/,
    );
    expect(() => verifyScopeToken("body.signature", "short")).toThrow(
      /at least 32 characters/,
    );
  });
});
