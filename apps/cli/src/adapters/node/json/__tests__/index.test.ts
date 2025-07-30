import { err, ok } from "neverthrow";
import { describe, expect, it } from "vitest";

import { parseJson } from "../index.js";

describe("parseJson", () => {
  const validJSONString = '{"name": "test"}';

  it("should return JS object when valid JSON is provided", () => {
    const result = parseJson(validJSONString);

    expect(result).toStrictEqual(ok({ name: "test" }));
  });

  it("should return error when invalid JSON is provided", () => {
    const result = parseJson("invalid JSON");

    expect(result).toStrictEqual(err(new Error("Failed to parse JSON")));
  });
});
