import { err, ok } from "neverthrow";
import { describe, expect, it } from "vitest";

import { toJSON } from "../index.js";

describe("toJSON", () => {
  const validJSON = '{"name": "test"}';

  it("should return JSON when valid JSON is provided", () => {
    const result = toJSON(validJSON);

    expect(result).toStrictEqual(ok({ name: "test" }));
  });

  it("should return error when invalid JSON is provided", () => {
    const result = toJSON("invalid JSON");

    expect(result).toStrictEqual(err(new Error("Failed to parse JSON")));
  });
});
