import { createCanvas, joinSession } from "@github/copilot-sdk/extension";
// Registers the brownfield documentation canvas with the current Copilot session.
import { fileURLToPath } from "node:url";

import { createActorState } from "./actor-state.mjs";
import { readCurrentGitHubRepository } from "./current-repository.mjs";
import { startServer } from "./server.mjs";
import { findUseCasesPrompt, syncPrompt } from "./sync-prompt.mjs";

const servers = new Map();
const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const currentRepository = await readCurrentGitHubRepository(repositoryRoot);
const actorState = createActorState(
  fileURLToPath(
    new URL("../../../docs/brownfield/state.json", import.meta.url),
  ),
);
const session = await joinSession({
  canvases: [
    createCanvas({
      actions: [
        {
          description:
            "Read saved repositories, active and archived actors, use cases and entities, and storage path.",
          handler: async () => ({
            ...(await actorState.read()),
            currentRepository,
          }),
          name: "read_actors",
        },
        {
          description: "Append findings, classify existing actors, and reword active use cases using a state revision.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            required: ["revision", "actors", "useCases"],
            properties: {
              revision: { type: ["string", "null"], pattern: "^[0-9a-f]{64}$" },
              actors: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["name", "description"],
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    role: { type: "string", enum: ["Primary", "Supporting"] },
                    sourceRevisions: {
                      type: "array", minItems: 1,
                      items: {
                        type: "object", additionalProperties: false, required: ["fullName", "sha"],
                        properties: { fullName: { type: "string" }, sha: { type: "string", pattern: "^[0-9a-f]{40}$" } },
                      },
                    },
                  },
                },
              },
              actorRoleUpdates: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["actorName", "role"],
                  properties: {
                    actorId: { type: "string", minLength: 1 },
                    actorName: { type: "string", minLength: 1 },
                    role: { type: "string", enum: ["Primary", "Supporting"] },
                  },
                },
              },
              useCases: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["title", "description", "actorNames"],
                  properties: {
                    title: { type: "string" },
                    description: { type: "string", minLength: 1, description: "Functional flow in at most five sentences, without implementation details." },
                    actorNames: { type: "array", items: { type: "string" }, minItems: 1, uniqueItems: true },
                    sourceRevisions: {
                      type: "array", minItems: 1,
                      items: {
                        type: "object", additionalProperties: false, required: ["fullName", "sha"],
                        properties: { fullName: { type: "string" }, sha: { type: "string", pattern: "^[0-9a-f]{40}$" } },
                      },
                    },
                  },
                },
              },
              sourceUpdates: {
                type: "array",
                items: {
                  type: "object", additionalProperties: false,
                  required: ["kind", "name", "sourceRevisions"],
                  properties: {
                    kind: { type: "string", enum: ["actor", "useCase"] },
                    id: { type: "string", minLength: 1 },
                    name: { type: "string", minLength: 1 },
                    sourceRevisions: {
                      type: "array", minItems: 1,
                      items: {
                        type: "object", additionalProperties: false, required: ["fullName", "sha"],
                        properties: { fullName: { type: "string" }, sha: { type: "string", pattern: "^[0-9a-f]{40}$" } },
                      },
                    },
                  },
                },
              },
              useCaseUpdates: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["originalTitle", "title", "description", "renamedActorName", "actorNames"],
                  properties: {
                    useCaseId: { type: "string", minLength: 1 },
                    originalTitle: { type: "string", minLength: 1 },
                    title: { type: "string", minLength: 1 },
                    description: { type: "string", minLength: 1 },
                    renamedActorName: { type: "string", minLength: 1 },
                    actorNames: { type: "array", items: { type: "string" }, minItems: 1, uniqueItems: true },
                  },
                },
              },
            },
          },
          handler: async ({ input }) => actorState.addFindings(input),
          name: "add_findings",
        },
      ],
      description:
        "Manage code repositories, actors and use cases in persistent repository JSON state.",
      displayName: "Brownfield documentation",
      id: "brownfield-docs",
      inputSchema: {
        additionalProperties: false,
        properties: {},
        type: "object",
      },
      onClose: async (ctx) => {
        const pending = servers.get(ctx.instanceId);
        servers.delete(ctx.instanceId);
        if (pending) await (await pending).close();
      },
      open: async (ctx) => {
        // Cache the promise as well, so concurrent opens share one server.
        if (!servers.has(ctx.instanceId)) {
          const pending = startServer(actorState, currentRepository,
            () => session.send({ prompt: syncPrompt(ctx.instanceId) }),
            () => session.send({ prompt: findUseCasesPrompt(ctx.instanceId) }),
          );
          servers.set(ctx.instanceId, pending);
          pending.catch(() => servers.delete(ctx.instanceId));
        }
        const entry = await servers.get(ctx.instanceId);
        return {
          title: "Brownfield documentation",
          url: entry.url,
        };
      },
    }),
  ],
});
