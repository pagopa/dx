/**
 * Verifies human-readable duration, credit, and token formatting.
 */
import { describe, expect, it } from "vitest";

import {
  formatConversationBlock,
  formatCredits,
  formatDuration,
  formatLogText,
  formatStructuredValue,
  formatTokens,
  LOG_TEXT_LIMIT,
} from "../format.js";

describe("formatDuration", () => {
  it("formats seconds, minutes, and hours", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(1400)).toBe("1s");
    expect(formatDuration(61_000)).toBe("1m 1s");
    expect(formatDuration(3_661_000)).toBe("1h 1m 1s");
  });
});

describe("formatCredits", () => {
  it("keeps integers and rounds fractional credits", () => {
    expect(formatCredits(3)).toBe("3");
    expect(formatCredits(1.234)).toBe("1.23");
  });
});

describe("formatTokens", () => {
  it("prints input and output token counts", () => {
    expect(formatTokens(12, 34)).toBe("12 in / 34 out");
  });
});

describe("formatLogText", () => {
  it("returns trimmed text when it fits the limit", () => {
    expect(formatLogText("  keep this  ")).toBe("keep this");
  });

  it("truncates long text and reports remaining characters", () => {
    const text = "a".repeat(LOG_TEXT_LIMIT + 12);
    const preview = formatLogText(text);
    expect(preview.startsWith("a".repeat(LOG_TEXT_LIMIT))).toBe(true);
    expect(preview.endsWith("… (12 more chars)")).toBe(true);
  });
});

describe("formatConversationBlock", () => {
  it("indents the body under the title", () => {
    expect(
      formatConversationBlock("Assistant (11 chars)", "hello\nworld"),
    ).toBe("Assistant (11 chars)\n  hello\n  world");
  });
});

describe("formatStructuredValue", () => {
  it("pretty-prints objects and JSON strings", () => {
    expect(formatStructuredValue({ path: "infra/main.tf" })).toBe(
      '{\n  "path": "infra/main.tf"\n}',
    );
    expect(formatStructuredValue('{"path":"infra/main.tf"}')).toBe(
      '{\n  "path": "infra/main.tf"\n}',
    );
  });
});
