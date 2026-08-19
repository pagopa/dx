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

  it("summarizes tool requests without dumping assistant text at -v", () => {
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

  it("reports assistant reply size at -v", () => {
    expect(
      describeCopilotEvent(
        JSON.stringify({
          data: { content: "Use the DX module", toolRequests: [] },
          type: "assistant.message",
        }),
      ),
    ).toEqual({
      message: "Assistant replied ({chars} chars)",
      properties: { chars: 17 },
    });
  });

  it("prints assistant answers as a readable block at -vv", () => {
    expect(
      describeCopilotEvent(
        JSON.stringify({
          data: { content: "Use the DX module", toolRequests: [] },
          type: "assistant.message",
        }),
        2,
      ),
    ).toEqual({
      message: "Assistant (17 chars)\n  Use the DX module",
      properties: {},
    });
  });

  it("prints user messages only at -vv", () => {
    const line = JSON.stringify({
      data: { content: "Add a Function App" },
      type: "user.message",
    });
    expect(describeCopilotEvent(line)).toBeUndefined();
    expect(describeCopilotEvent(line, 2)).toEqual({
      message: "User (18 chars)\n  Add a Function App",
      properties: {},
    });
  });

  it("surfaces questions the agent asks the user at -vv", () => {
    expect(
      describeCopilotEvent(
        JSON.stringify({
          data: {
            content: "",
            toolRequests: [
              {
                arguments: { question: "Which environment?" },
                name: "ask_user",
              },
            ],
          },
          type: "assistant.message",
        }),
        2,
      ),
    ).toEqual({
      message: "Agent asked (18 chars)\n  Which environment?",
      properties: { tools: "ask_user" },
    });
  });

  it("prints tool arguments only at -vv", () => {
    const line = JSON.stringify({
      data: {
        arguments: { path: "infra/main.tf" },
        toolName: "view",
      },
      type: "tool.execution_start",
    });
    expect(describeCopilotEvent(line)).toEqual({
      message: "Started tool {tool}",
      properties: { tool: "view" },
    });
    expect(describeCopilotEvent(line, 2)).toEqual({
      message: 'Started tool view\n  {\n    "path": "infra/main.tf"\n  }',
      properties: { tool: "view" },
    });
  });

  it("ignores unknown or invalid lines", () => {
    expect(describeCopilotEvent("not-json")).toBeUndefined();
    expect(
      describeCopilotEvent(JSON.stringify({ name: "chat gpt", type: "span" })),
    ).toBeUndefined();
  });
});
