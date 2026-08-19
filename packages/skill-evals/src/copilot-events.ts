/**
 * Turns Copilot JSONL stdout into concise progress lines.
 *
 * Level 1 surfaces phases and tool names. Level 2 adds agent Q&A and the
 * arguments passed when a tool starts. The full event log stays on disk.
 */
import { z } from "zod";

import {
  formatConversationBlock,
  formatLogText,
  formatStructuredValue,
} from "./format.js";
import { type Verbosity } from "./verbosity.js";

export type CopilotProgressEvent = Readonly<{
  message: string;
  properties: Record<string, unknown>;
}>;

const eventSchema = z.object({
  data: z.record(z.string(), z.unknown()).optional(),
  name: z.string().optional(),
  type: z.string().optional(),
});

const skillSchema = z.object({
  name: z.string(),
});

const toolRequestSchema = z
  .object({
    arguments: z.unknown().optional(),
    name: z.string().optional(),
    toolName: z.string().optional(),
  })
  .catchall(z.unknown());

const interestingTypes = new Set([
  "assistant.message",
  "error",
  "session.end",
  "session.idle",
  "session.skills_loaded",
  "session.start",
  "tool.execution_complete",
  "tool.execution_start",
  "user.message",
]);

const toolName = (request: unknown): string | undefined => {
  const parsed = toolRequestSchema.safeParse(request);
  if (!parsed.success) {
    return undefined;
  }
  return parsed.data.name ?? parsed.data.toolName;
};

const skillNames = (value: unknown): readonly string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((skill) => {
    const parsed = skillSchema.safeParse(skill);
    return parsed.success ? [parsed.data.name] : [];
  });
};

const messageText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const askUserQuestion = (request: unknown): string | undefined => {
  const parsed = toolRequestSchema.safeParse(request);
  if (!parsed.success) {
    return undefined;
  }
  const name = parsed.data.name ?? parsed.data.toolName;
  if (name !== "ask_user") {
    return undefined;
  }
  const args = parsed.data.arguments;
  if (typeof args === "string" && args.trim()) {
    return args.trim();
  }
  if (!args || typeof args !== "object") {
    return undefined;
  }
  const fields = ["question", "message", "prompt", "title"];
  for (const field of fields) {
    const value = Reflect.get(args, field);
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
};

const toolArguments = (data: Readonly<Record<string, unknown>>): unknown => {
  const keys = ["arguments", "input", "params", "args"];
  for (const key of keys) {
    if (key in data && data[key] !== undefined) {
      return data[key];
    }
  }
  return undefined;
};

const summarizeUser = (
  data: Readonly<Record<string, unknown>>,
): CopilotProgressEvent | undefined => {
  const text = messageText(data.content);
  if (!text) {
    return undefined;
  }
  return {
    message: formatConversationBlock(
      `User (${text.length} chars)`,
      formatLogText(text),
    ),
    properties: {},
  };
};

const summarizeAssistant = (
  data: Readonly<Record<string, unknown>>,
  verbosity: Verbosity,
): CopilotProgressEvent | undefined => {
  const requests = Array.isArray(data.toolRequests) ? data.toolRequests : [];
  const names = requests.flatMap((request) => {
    const name = toolName(request);
    return name ? [name] : [];
  });
  const [question] = requests.flatMap((request) => {
    const asked = askUserQuestion(request);
    return asked ? [asked] : [];
  });
  const content = messageText(data.content);

  if (question && verbosity >= 2) {
    return {
      message: formatConversationBlock(
        `Agent asked (${question.length} chars)`,
        formatLogText(question),
      ),
      properties: { tools: names.join(", ") },
    };
  }

  if (names.length > 0) {
    return {
      message: "Requested tools {tools}",
      properties: { tools: names.join(", ") },
    };
  }

  if (!content) {
    return undefined;
  }
  if (verbosity < 2) {
    return {
      message: "Assistant replied ({chars} chars)",
      properties: { chars: content.length },
    };
  }
  return {
    message: formatConversationBlock(
      `Assistant (${content.length} chars)`,
      formatLogText(content),
    ),
    properties: {},
  };
};

const summarizeTool = (
  type: string,
  data: Readonly<Record<string, unknown>>,
  verbosity: Verbosity,
): CopilotProgressEvent | undefined => {
  const name =
    (typeof data.toolName === "string" && data.toolName) ||
    (typeof data.name === "string" && data.name) ||
    undefined;
  if (!name) {
    return undefined;
  }
  const args =
    type === "tool.execution_start" ? toolArguments(data) : undefined;
  if (verbosity >= 2 && args !== undefined) {
    return {
      message: formatConversationBlock(
        `Started tool ${name}`,
        formatStructuredValue(args),
      ),
      properties: { tool: name },
    };
  }
  return {
    message:
      type === "tool.execution_start"
        ? "Started tool {tool}"
        : "Finished tool {tool}",
    properties: { tool: name },
  };
};

const summarizeSession = (
  type: string,
  data: Readonly<Record<string, unknown>>,
): CopilotProgressEvent | undefined => {
  if (type === "session.start") {
    return { message: "Copilot session started", properties: {} };
  }
  if (type === "session.end") {
    return { message: "Copilot session ended", properties: {} };
  }
  if (type === "session.idle") {
    return { message: "Copilot session idle", properties: {} };
  }
  if (type !== "session.skills_loaded") {
    return undefined;
  }
  const skills = skillNames(data.skills);
  return {
    message: skills.length > 0 ? "Loaded skills {skills}" : "Loaded skills",
    properties: skills.length > 0 ? { skills: skills.join(", ") } : {},
  };
};

const summarizeError = (
  event: Readonly<{ name?: string }>,
  data: Readonly<Record<string, unknown>>,
): CopilotProgressEvent => {
  const error =
    typeof data.message === "string"
      ? data.message
      : typeof event.name === "string"
        ? event.name
        : "unknown error";
  return { message: "Copilot error: {error}", properties: { error } };
};

const summarizeEvent = (
  type: string,
  event: Readonly<{ name?: string }>,
  data: Readonly<Record<string, unknown>>,
  verbosity: Verbosity,
): CopilotProgressEvent | undefined => {
  if (type.startsWith("session.")) {
    return summarizeSession(type, data);
  }
  if (type === "user.message") {
    return verbosity >= 2 ? summarizeUser(data) : undefined;
  }
  if (type === "assistant.message") {
    return summarizeAssistant(data, verbosity);
  }
  if (type === "tool.execution_start" || type === "tool.execution_complete") {
    return summarizeTool(type, data, verbosity);
  }
  if (type === "error") {
    return summarizeError(event, data);
  }
  return undefined;
};

/** Returns a concise log line for a Copilot JSONL event, or undefined. */
export const describeCopilotEvent = (
  line: string,
  verbosity: Verbosity = 1,
): CopilotProgressEvent | undefined => {
  try {
    const parsed = eventSchema.safeParse(JSON.parse(line));
    if (!parsed.success) {
      return undefined;
    }

    const event = parsed.data;
    const type = event.type;
    if (!type || !interestingTypes.has(type)) {
      return undefined;
    }

    return summarizeEvent(type, event, event.data ?? {}, verbosity);
  } catch {
    return undefined;
  }
};
