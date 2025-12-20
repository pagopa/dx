/**
 * Unit tests for OA3 resolver.
 */

import { describe, expect, it, vi } from "vitest";

import { ParseError } from "@/core/errors/index.js";
import { OA3Resolver } from "@/core/resolver/index.js";

vi.mock("@apidevtools/swagger-parser", () => ({
  default: {
    dereference: vi.fn(),
  },
}));

import SwaggerParser from "@apidevtools/swagger-parser";

const mockDereference = vi.mocked(SwaggerParser.dereference);

describe("OA3Resolver", () => {
  it("should resolve valid OA3 spec", async () => {
    const mockSpec = {
      info: { title: "Test API", version: "1.0.0" },
      openapi: "3.0.0",
      paths: {},
    };
    mockDereference.mockResolvedValue(mockSpec);

    const resolver = new OA3Resolver("spec.yaml");
    const result = await resolver.resolve();

    expect(result).toEqual(mockSpec);
    expect(mockDereference).toHaveBeenCalledWith("spec.yaml");
  });

  it("should throw ParseError when dereference fails with Error", async () => {
    mockDereference.mockRejectedValue(new Error("Invalid spec"));

    const resolver = new OA3Resolver("invalid.yaml");

    await expect(resolver.resolve()).rejects.toThrow(ParseError);
  });

  it("should throw ParseError when dereference fails with non-Error", async () => {
    mockDereference.mockRejectedValue("String error");

    const resolver = new OA3Resolver("invalid.yaml");

    await expect(resolver.resolve()).rejects.toThrow(ParseError);
  });
});
