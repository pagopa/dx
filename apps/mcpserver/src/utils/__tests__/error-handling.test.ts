import type { InternalAxiosRequestConfig } from "axios";

import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { handleApiError, isAxiosError, isZodError } from "../error-handling.js";

/**
 * Helper to create an AxiosError with a response
 */
const createAxiosResponseError = (status: number, statusText: string) => {
  const config: InternalAxiosRequestConfig = { headers: new AxiosHeaders() };
  return new AxiosError(statusText, "ERR_BAD_REQUEST", config, undefined, {
    config,
    data: {},
    headers: {},
    status,
    statusText,
  });
};

describe("handleApiError - Axios HTTP status codes", () => {
  it("should handle 400 Bad Request", () => {
    const error = createAxiosResponseError(400, "Bad Request");
    expect(handleApiError(error)).toBe(
      "Error: Bad request. Please check your input parameters.",
    );
  });

  it("should handle 401 Unauthorized", () => {
    const error = createAxiosResponseError(401, "Unauthorized");
    expect(handleApiError(error)).toBe(
      "Error: Authentication failed. Please check your credentials.",
    );
  });

  it("should handle 403 Forbidden", () => {
    const error = createAxiosResponseError(403, "Forbidden");
    expect(handleApiError(error)).toBe(
      "Error: Permission denied. You don't have access to this resource.",
    );
  });

  it("should handle 404 Not Found", () => {
    const error = createAxiosResponseError(404, "Not Found");
    expect(handleApiError(error)).toBe(
      "Error: Resource not found. Please check the ID is correct.",
    );
  });

  it("should handle 429 Rate Limit", () => {
    const error = createAxiosResponseError(429, "Too Many Requests");
    expect(handleApiError(error)).toBe(
      "Error: Rate limit exceeded. Please wait before making more requests.",
    );
  });

  it("should handle 500 Internal Server Error", () => {
    const error = createAxiosResponseError(500, "Internal Server Error");
    expect(handleApiError(error)).toBe(
      "Error: Server error. The service is temporarily unavailable.",
    );
  });

  it("should handle 502 Bad Gateway", () => {
    const error = createAxiosResponseError(502, "Bad Gateway");
    expect(handleApiError(error)).toBe(
      "Error: Bad gateway. The service is temporarily unavailable.",
    );
  });

  it("should handle 503 Service Unavailable", () => {
    const error = createAxiosResponseError(503, "Service Unavailable");
    expect(handleApiError(error)).toBe(
      "Error: Service unavailable. Please try again later.",
    );
  });

  it("should handle unknown status codes", () => {
    const error = createAxiosResponseError(418, "I'm a teapot");
    expect(handleApiError(error)).toBe(
      "Error: API request failed with status 418",
    );
  });
});

describe("handleApiError - Axios network errors", () => {
  it("should handle ECONNABORTED timeout errors", () => {
    const error = new AxiosError("Timeout", "ECONNABORTED");
    expect(handleApiError(error)).toBe(
      "Error: Request timed out. Please try again.",
    );
  });

  it("should handle ENOTFOUND errors", () => {
    const error = new AxiosError("Not Found", "ENOTFOUND");
    expect(handleApiError(error)).toBe(
      "Error: Could not connect to the server. Please check your network.",
    );
  });

  it("should handle ECONNREFUSED errors", () => {
    const error = new AxiosError("Connection Refused", "ECONNREFUSED");
    expect(handleApiError(error)).toBe(
      "Error: Connection refused. The server may be down.",
    );
  });

  it("should handle other network errors", () => {
    const error = new AxiosError("Unknown network error");
    expect(handleApiError(error)).toBe(
      "Error: Network error occurred: Unknown network error",
    );
  });
});

describe("handleApiError - Zod validation errors", () => {
  it("should format single validation error", () => {
    const error = new ZodError([
      {
        code: "too_small",
        inclusive: true,
        message: "String must contain at least 3 character(s)",
        minimum: 3,
        path: ["query"],
        type: "string",
      },
    ]);
    expect(handleApiError(error)).toBe(
      "Error: Invalid input - query: String must contain at least 3 character(s)",
    );
  });

  it("should format multiple validation errors", () => {
    const error = new ZodError([
      {
        code: "too_small",
        inclusive: true,
        message: "String must contain at least 3 character(s)",
        minimum: 3,
        path: ["query"],
        type: "string",
      },
      {
        code: "invalid_type",
        expected: "number",
        message: "Expected number, received string",
        path: ["page"],
        received: "string",
      },
    ]);
    expect(handleApiError(error)).toBe(
      "Error: Invalid input - query: String must contain at least 3 character(s); page: Expected number, received string",
    );
  });

  it("should handle nested path errors", () => {
    const error = new ZodError([
      {
        code: "invalid_type",
        expected: "string",
        message: "Required",
        path: ["data", "nested", "field"],
        received: "undefined",
      },
    ]);
    expect(handleApiError(error)).toBe(
      "Error: Invalid input - data.nested.field: Required",
    );
  });
});

describe("handleApiError - generic errors", () => {
  it("should handle Error instances", () => {
    const error = new Error("Something went wrong");
    expect(handleApiError(error)).toBe("Error: Something went wrong");
  });

  it("should handle string errors", () => {
    expect(handleApiError("Raw string error")).toBe(
      "Error: Unexpected error occurred: Raw string error",
    );
  });

  it("should handle null", () => {
    expect(handleApiError(null)).toBe("Error: Unexpected error occurred: null");
  });

  it("should handle undefined", () => {
    expect(handleApiError(undefined)).toBe(
      "Error: Unexpected error occurred: undefined",
    );
  });

  it("should handle objects", () => {
    expect(handleApiError({ custom: "error" })).toBe(
      "Error: Unexpected error occurred: [object Object]",
    );
  });
});

describe("isAxiosError", () => {
  it("should return true for AxiosError instances", () => {
    const error = new AxiosError("Test error");
    expect(isAxiosError(error)).toBe(true);
  });

  it("should return false for regular Error instances", () => {
    const error = new Error("Test error");
    expect(isAxiosError(error)).toBe(false);
  });

  it("should return false for non-errors", () => {
    expect(isAxiosError("string")).toBe(false);
    expect(isAxiosError(null)).toBe(false);
    expect(isAxiosError(undefined)).toBe(false);
  });
});

describe("isZodError", () => {
  it("should return true for ZodError instances", () => {
    const error = new ZodError([]);
    expect(isZodError(error)).toBe(true);
  });

  it("should return false for regular Error instances", () => {
    const error = new Error("Test error");
    expect(isZodError(error)).toBe(false);
  });

  it("should return false for non-errors", () => {
    expect(isZodError("string")).toBe(false);
    expect(isZodError(null)).toBe(false);
    expect(isZodError(undefined)).toBe(false);
  });
});
