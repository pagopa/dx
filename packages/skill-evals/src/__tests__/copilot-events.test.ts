/**
 * Verifies Copilot JSONL events become concise verbose progress lines.
 */
import { describe, expect, it } from "vitest";

import { describeCopilotEvent } from "../copilot-events.js";

describe("describeCopilotEvent", () => {
  it("summarizes loaded skills", () => {
    expect(
      describeCopilotEvent(
        JSON.stringify({
          data: {
            skills: [{ name: "terraform-best-practices", source: "plugin" }],
          },
          type: "session.skills_loaded",
        }),
      ),
    ).toEqual({
      message: "Loaded skills {skills}",
      properties: { skills: "terraform-best-practices" },
    });
  });

  it("summarizes tool requests without dumping assistant text", () => {
    expect(
      describeCopilotEvent(
        JSON.stringify({
          data: {
            content: "I will inspect the repository",
            toolRequests: [{ name: "view" }, { name: "skill" }],
          },
          type: "assistant.message",
        }),
      ),
    ).toEqual({
      message: "Requested tools {tools}",
      properties: { tools: "view, skill" },
    });
  });

  it("reports assistant reply size when no tools are requested", () => {
    expect(
      describeCopilotEvent(
        JSON.stringify({
          data: { content: "done", toolRequests: [] },
          type: "assistant.message",
        }),
      ),
    ).toEqual({
      message: "Assistant replied ({chars} chars)",
      properties: { chars: 4 },
    });
  });

  it("ignores unknown or invalid lines", () => {
    expect(describeCopilotEvent("not-json")).toBeUndefined();
    expect(
      describeCopilotEvent(JSON.stringify({ name: "chat gpt", type: "span" })),
    ).toBeUndefined();
  });
});
