// Stores repository-owned actor state with revision checks and cross-process save locking.
import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  link,
  open,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";

import { RequestError } from "./request-error.mjs";
import { isValidGitHubRepository, isValidGitHubRepositories } from "./github-repository.mjs";
import { availableActorRanges, labelRanges } from "./actor-mentions.mjs";

export function createActorState(statePath) {
  async function readExisting() {
    let content;
    try {
      content = await readFile(statePath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      return {
        path: statePath,
        revision: null,
        state: { actors: [], repositories: [], schemaVersion: 1, useCases: [] },
      };
    }
    let state;
    try {
      state = JSON.parse(content);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      throw new RequestError(
        422,
        `Invalid JSON in ${statePath}. Fix the file before saving.`,
      );
    }
    validateState(state);
    return { path: statePath, revision: digest(content), state: confirmEntities(state) };
  }

  async function read() {
    const current = await readExisting();
    if (current.revision !== null) return current;

    await mkdir(dirname(statePath), { recursive: true });
    const temporaryPath = `${statePath}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(current.state, null, 2)}\n`, { flag: "wx" });
    try {
      try {
        await link(temporaryPath, statePath);
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
      }
    } finally {
      await unlink(temporaryPath);
    }
    return readExisting();
  }

  async function withStateLock(action) {
    await mkdir(dirname(statePath), { recursive: true });
    const lockPath = `${statePath}.lock`;
    let lock;
    try {
      lock = await open(lockPath, "wx");
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      throw new RequestError(
        409,
        `State is being saved. Retry later. If a process crashed, remove the stale lock at ${lockPath} only after checking no save is running.`,
      );
    }
    try {
      return await action();
    } finally {
      await lock.close();
      await unlink(lockPath);
    }
  }

  async function writeAtomically(targetPath, content, revision) {
    const temporaryPath = `${targetPath}.${randomUUID()}.tmp`;
    let temporaryExists = false;
    try {
      await writeFile(temporaryPath, content, { flag: "wx" });
      temporaryExists = true;
      if ((await readExisting()).revision !== revision) {
        throw new RequestError(
          409,
          "State changed during saving. Reload the saved state and reapply your edits.",
        );
      }
      await rename(temporaryPath, targetPath);
      temporaryExists = false;
    } finally {
      if (temporaryExists) await unlink(temporaryPath);
    }
  }

  async function save(input) {
    if (
      !input ||
      !(input.revision === null || typeof input.revision === "string")
    ) {
      throw new RequestError(400, "A loaded state revision is required.");
    }
    validateState(input.state);
    const state = confirmEntities(input.state);
    return withStateLock(async () => {
      const current = await readExisting();
      if (current.revision !== input.revision) {
        throw new RequestError(
          409,
          "State changed since it was loaded. Reload the saved state and reapply your edits.",
        );
      }
      const content = `${JSON.stringify(state, null, 2)}\n`;
      await writeAtomically(statePath, content, input.revision);
      return { path: statePath, revision: digest(content), state };
    });
  }

  async function generateDocument(input) {
    if (!input || !(input.revision === null || typeof input.revision === "string")) {
      throw new RequestError(400, "A loaded state revision is required.");
    }
    return withStateLock(async () => {
      const current = await readExisting();
      if (current.revision !== input.revision) {
        throw new RequestError(
          409,
          "State changed since it was loaded. Reload the saved state before generating the document.",
        );
      }
      const path = join(dirname(statePath), "brownfield.md");
      await writeAtomically(path, renderBrownfieldDocument(current.state), input.revision);
      return { path };
    });
  }

  async function addFindings(input) {
    if (!input || !(input.revision === null ||
      (typeof input.revision === "string" && /^[0-9a-f]{64}$/.test(input.revision)))) {
      throw new RequestError(400, "A complete state revision is required. Read the current state and retry.");
    }
    const current = await readExisting();
    if (current.revision !== input.revision) {
      throw new RequestError(409, "State changed since it was read. Read the current state, reconcile findings, and retry with its exact revision.");
    }
    if (Object.hasOwn(input, "entities")) {
      throw new RequestError(422, "Entity discovery is no longer supported.");
    }
    const sourcesForSync = (revisions) => {
      if (!validSourceRevisions(revisions) ||
          revisions.some(({ fullName }) => !(current.state.repositories ?? [])
            .some((repository) => repository.fullName.toLowerCase() === fullName.toLowerCase()))) {
        throw new RequestError(422, "Source revisions must identify configured GitHub repositories and full commit SHAs.");
      }
      return revisions.map(({ fullName, sha }) => ({ fullName, sha }));
    };
    const actors = input.actors.map(({ name, description, role, sourceRevisions }) => ({
      id: randomUUID(), name, description, accepted: false,
      ...(role === undefined ? {} : { role }),
      ...(sourceRevisions === undefined ? {} : { sourceRevisions: sourcesForSync(sourceRevisions) }),
    }));
    const roleUpdates = input.actorRoleUpdates ?? [];
    if (!Array.isArray(roleUpdates)) {
      throw new RequestError(422, "Actor role updates must be an array.");
    }
    const updatedActors = [...current.state.actors];
    const updatedActorIndexes = new Set();
    for (const update of roleUpdates) {
      if (!update || typeof update !== "object" || !validActorRole(update.role)) {
        throw new RequestError(422, "Actor role updates require a Primary or Supporting role.");
      }
      const candidates = updatedActors.flatMap((actor, index) =>
        actor.name === update.actorName && (!update.actorId || actor.id === update.actorId)
          ? [index] : [],
      );
      if (candidates.length !== 1 || updatedActorIndexes.has(candidates[0]) ||
          updatedActors[candidates[0]].role !== undefined) {
        throw new RequestError(422, "Actor role update must identify one active actor without a role exactly once.");
      }
      const index = candidates[0];
      updatedActorIndexes.add(index);
      updatedActors[index] = { ...updatedActors[index], role: update.role };
    }
    const useCases = input.useCases.map(({ title, description, actorNames, sourceRevisions }) => {
      if (typeof description !== "string" || !description.trim()) {
        throw new RequestError(422, "An inferred use case needs a nonempty description.");
      }
      const sentences = new Intl.Segmenter(undefined, { granularity: "sentence" }).segment(description);
      if (Array.from(sentences).length > 5) {
        throw new RequestError(422, "An inferred use-case description must contain at most five sentences.");
      }
      const finding = { id: randomUUID(), title, description, accepted: false };
      if (sourceRevisions !== undefined) finding.sourceRevisions = sourcesForSync(sourceRevisions);
      if (actorNames !== undefined) {
        finding.actorMentions = buildActorMentions(description, actorNames, current.state.actors);
      }
      return finding;
    });
    const updates = input.useCaseUpdates ?? [];
    if (!Array.isArray(updates)) {
      throw new RequestError(422, "Use-case updates must be an array.");
    }
    const updatedCases = [...(current.state.useCases ?? [])];
    const updatedIndexes = new Set();
    let hasUpdates = false;
    for (const update of updates) {
      if (!update || typeof update !== "object") {
        throw new RequestError(422, "A use-case update must be an object.");
      }
      const candidates = updatedCases.flatMap((item, index) =>
        item.title === update.originalTitle &&
        (update.useCaseId ? item.id === update.useCaseId : !item.id) ? [index] : [],
      );
      if (candidates.length !== 1 || updatedIndexes.has(candidates[0])) {
        throw new RequestError(422, "Use-case update must identify one active use case exactly once.");
      }
      const index = candidates[0];
      updatedIndexes.add(index);
      const existing = updatedCases[index];
      const renamedActors = current.state.actors.filter((actor) =>
        actor.accepted === true && actor.name === update.renamedActorName,
      );
      if (renamedActors.length !== 1 ||
          !(renamedActors[0].aliases?.length ||
            existing.actorMentions?.some((mention) =>
              mention.actorId === renamedActors[0].id && mention.label !== renamedActors[0].name))) {
        throw new RequestError(422, "A use-case update must identify one renamed, confirmed actor.");
      }
      if (typeof update.title !== "string" || !update.title.trim() ||
          typeof update.description !== "string" || !update.description.trim() ||
          !Array.isArray(update.actorNames) || !update.actorNames.includes(update.renamedActorName)) {
        throw new RequestError(422, "A use-case update needs a title, description, and the renamed actor.");
      }
      if (existing.title === update.title && existing.description === update.description) continue;
      const actorMentions = buildActorMentions(update.description, update.actorNames, current.state.actors);
      if (update.actorNames.some((name) => !actorMentions.some((mention) => mention.label === name))) {
        throw new RequestError(422, "Updated descriptions must use each actor's exact current name.");
      }
      if (existing.actorMentions?.some((mention) =>
        !actorMentions.some((updated) => updated.actorId === mention.actorId))) {
        throw new RequestError(422, "A use-case update must preserve existing actor links.");
      }
      const aliases = [...(existing.aliases ?? [])];
      if (existing.title !== update.title &&
          !aliases.some((alias) => alias.trim().toLowerCase() === existing.title.trim().toLowerCase())) {
        aliases.push(existing.title);
      }
      updatedCases[index] = {
        ...existing,
        id: existing.id ?? randomUUID(),
        title: update.title,
        description: update.description,
        accepted: false,
        actorMentions,
        ...(aliases.length ? { aliases } : {}),
      };
      hasUpdates = true;
    }
    for (const index of updatedIndexes) {
      const name = updatedCases[index].title.trim().toLowerCase();
      const others = [...updatedCases.filter((_, otherIndex) => otherIndex !== index),
        ...(current.state.archivedUseCases ?? [])];
      if (others.some((item) => [item.title, ...(item.aliases ?? [])]
        .some((value) => value.trim().toLowerCase() === name))) {
        throw new RequestError(422, "Updated use-case title matches another active or archived finding.");
      }
    }
    const mergedActors = [
      ...current.state.actors.map((actor, index) =>
        updatedActorIndexes.has(index) ? { ...actor, role: updatedActors[index].role } : actor),
      ...actors,
    ];
    const sourceUpdates = input.sourceUpdates ?? [];
    if (!Array.isArray(sourceUpdates)) {
      throw new RequestError(422, "Source updates must be an array.");
    }
    let hasSourceUpdates = false;
    const updatedSourceKeys = new Set();
    for (const update of sourceUpdates) {
      if (!update || !["actor", "useCase"].includes(update.kind)) {
        throw new RequestError(422, "Source updates must identify an actor or use case.");
      }
      const entries = update.kind === "actor" ? mergedActors : updatedCases;
      const limit = update.kind === "actor" ? current.state.actors.length : entries.length;
      const field = update.kind === "actor" ? "name" : "title";
      const candidates = entries.slice(0, limit).flatMap((item, index) =>
        item[field] === update.name && (!update.id || item.id === update.id) ? [index] : []);
      const key = `${update.kind}:${candidates[0]}`;
      if (candidates.length !== 1 || updatedSourceKeys.has(key)) {
        throw new RequestError(422, "Source update must identify one active finding exactly once.");
      }
      updatedSourceKeys.add(key);
      const index = candidates[0];
      const existing = entries[index].sourceRevisions ?? [];
      const sources = [...existing];
      for (const source of sourcesForSync(update.sourceRevisions)) {
        if (!sources.some((item) => item.fullName.toLowerCase() === source.fullName.toLowerCase() && item.sha === source.sha)) {
          sources.push(source);
        }
      }
      if (sources.length !== existing.length) {
        entries[index] = { ...entries[index], sourceRevisions: sources };
        hasSourceUpdates = true;
      }
    }
    for (const [existing, additions, field] of [
      [[...current.state.actors, ...(current.state.archivedActors ?? [])], actors, "name"],
      [[...updatedCases, ...(current.state.archivedUseCases ?? [])], useCases, "title"],
    ]) {
      const names = new Set(
        existing.flatMap((item) => [item[field], ...(item.aliases ?? [])])
          .map((name) => name.trim().toLowerCase()),
      );
      for (const item of additions) {
        const name = item[field].trim().toLowerCase();
        if (names.has(name)) {
          throw new RequestError(422, `Duplicate or archived ${field} values are not allowed.`);
        }
        names.add(name);
      }
    }
    if (!actors.length && !useCases.length && !hasUpdates && !updatedActorIndexes.size && !hasSourceUpdates) return current;
    return save({
      revision: current.revision,
      state: {
        ...current.state,
        actors: mergedActors,
        useCases: [...updatedCases, ...useCases],
      },
    });
  }

  return { read, save, addFindings, generateDocument };
}

function renderBrownfieldDocument(state) {
  const actors = state.actors.filter((item) => item.accepted === true);
  const useCases = (state.useCases ?? []).filter((item) => item.accepted === true);
  const findings = [...actors, ...useCases];
  const sources = new Map();
  for (const repository of state.repositories ?? []) {
    sources.set(repository.fullName.toLowerCase(), { name: repository.fullName, shas: new Set() });
  }
  for (const finding of findings) {
    for (const source of finding.sourceRevisions ?? []) {
      const key = source.fullName.toLowerCase();
      if (!sources.has(key)) sources.set(key, { name: source.fullName, shas: new Set() });
      sources.get(key).shas.add(source.sha);
    }
  }
  const lines = [
    "# Brownfield documentation", "",
    "The actors and use cases below were inferred from source code and reviewed; they are not proposals. They may have been edited during review.", "",
    "## Source repositories", "",
    "Recorded commits are the revisions inspected for confirmed findings. Configured repositories are also listed when no commit has been recorded.",
  ];
  if (!sources.size) lines.push("", "No repositories or source commits recorded.");
  for (const { name, shas } of sources.values()) {
    lines.push("", `- ${escapeMarkdown(name)}: ${shas.size ? [...shas].sort().map((sha) => `\`${sha}\``).join(", ") : "commit not recorded"}`);
  }
  if (findings.some((item) => !item.sourceRevisions?.length)) {
    lines.push("", "Some confirmed findings have no recorded source commit.");
  }
  lines.push("", "## Actors");
  for (const actor of state.actors.filter((item) => item.accepted === true)) {
    lines.push("", `### ${escapeMarkdown(actor.name).replace(/\n/g, "<br>")}`, "",
      `**Role:** ${actor.role ?? "Unspecified"}`, "",
      escapeMarkdown(actor.description).replace(/\n/g, "<br>\n"));
  }
  lines.push("", "## Use cases");
  for (const useCase of useCases) {
    lines.push("", `### ${escapeMarkdown(useCase.title).replace(/\n/g, "<br>")}`, "",
      escapeMarkdown(useCase.description).replace(/\n/g, "<br>\n"));
  }
  return `${lines.join("\n")}\n`;
}

function escapeMarkdown(value) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/[\\`*_[\]{}()#+!|~]/g, "\\$&")
    .replace(/^([ \t]*)([-+])/gm, "$1\\$2")
    .replace(/^([ \t]*\d+)([.)])(?=\s)/gm, "$1\\$2")
    .replace(/^[ \t]+/gm, (indent) => indent.replace(/ /g, "&#32;").replace(/\t/g, "&#9;"));
}

function buildActorMentions(description, actorNames, actors) {
  if (!Array.isArray(actorNames) || !actorNames.length || actorNames.length > 500 ||
      new Set(actorNames).size !== actorNames.length) {
    throw new RequestError(422, "Each linked use case needs distinct confirmed actors.");
  }
  const mentions = [];
  for (const name of actorNames) {
    if (typeof name !== "string" || !name.trim()) {
      throw new RequestError(422, "Actor names must be nonempty strings.");
    }
    const matches = actors.filter((actor) => actor.accepted === true && actor.name === name);
    if (matches.length !== 1) {
      throw new RequestError(422, `Actor "${name}" must identify one active confirmed actor.`);
    }
    const actor = matches[0];
    const ranges = availableActorRanges(description, actor, mentions, actors);
    if (!ranges.length) {
      throw new RequestError(422, `Use-case description must contain a distinct, unlinked occurrence of actor "${name}".`);
    }
    actor.id ??= randomUUID();
    for (const { label } of ranges) {
      if (!mentions.some((mention) => mention.actorId === actor.id && mention.label === label)) {
        mentions.push({ actorId: actor.id, label });
      }
    }
  }
  return mentions;
}

function confirmEntities(state) {
  return {
    ...state,
    ...(state.entities ? { entities: state.entities.map((entity) => ({ ...entity, accepted: true })) } : {}),
    ...(state.archivedEntities ? { archivedEntities: state.archivedEntities.map((entity) => ({ ...entity, accepted: true })) } : {}),
  };
}

function digest(content) {
  return createHash("sha256").update(content).digest("hex");
}

function validFinding(item, field) {
  return item && typeof item === "object" && !Array.isArray(item) &&
    typeof item[field] === "string" && item[field].trim() && item[field].length <= 200 &&
    typeof item.description === "string" && item.description.length <= 10000 &&
    (!Object.hasOwn(item, "accepted") || typeof item.accepted === "boolean") &&
    (!Object.hasOwn(item, "sourceRevisions") || validSourceRevisions(item.sourceRevisions)) &&
    (!Object.hasOwn(item, "id") ||
      (typeof item.id === "string" && item.id.trim() && item.id.length <= 128)) &&
    (!Object.hasOwn(item, "aliases") ||
      (Array.isArray(item.aliases) && item.aliases.length <= 500 &&
        item.aliases.every((alias) =>
          typeof alias === "string" && alias.trim() && alias.length <= 200)));
}

function validSourceRevisions(revisions) {
  if (!Array.isArray(revisions) || revisions.length < 1 || revisions.length > 500) return false;
  const seen = new Set();
  return revisions.every((source) => {
    if (!source || typeof source !== "object" || Array.isArray(source) ||
        !isValidGitHubRepository(source.fullName) ||
        typeof source.sha !== "string" || !/^[0-9a-f]{40}$/.test(source.sha)) return false;
    const key = `${source.fullName.toLowerCase()}:${source.sha}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function validActorRole(role) {
  return role === "Primary" || role === "Supporting";
}

function validActor(actor) {
  return validFinding(actor, "name") &&
    (!Object.hasOwn(actor, "role") || validActorRole(actor.role));
}

function validateState(state) {
  if (
    state &&
    Object.hasOwn(state, "entities") &&
    (!Array.isArray(state.entities) ||
      state.entities.length > 500 ||
      state.entities.some((entity) => !validFinding(entity, "name")))
  ) {
    throw new RequestError(
      422,
      "Invalid entity state: expected at most 500 entities with a nonempty name (max 200 characters), a description (max 10,000 characters), optional ID and aliases, and an optional boolean accepted flag.",
    );
  }
  if (
    state &&
    Object.hasOwn(state, "repositories") &&
    !isValidGitHubRepositories(state.repositories)
  ) {
    throw new RequestError(
      422,
      "Invalid repository sources: expected at most 500 unique GitHub repositories in owner/repository format.",
    );
  }
  if (
    state &&
    Object.hasOwn(state, "useCases") &&
    (!Array.isArray(state.useCases) ||
      state.useCases.length > 500 ||
      state.useCases.some((useCase) => !validFinding(useCase, "title")))
  ) {
    throw new RequestError(
      422,
      "Invalid use case state: expected at most 500 use cases with a nonempty title (max 200 characters), a description (max 10,000 characters), optional ID and aliases, and an optional boolean accepted flag. IDs must be nonempty and at most 128 characters; up to 500 aliases of at most 200 characters are allowed.",
    );
  }
  if (
    !state ||
    typeof state !== "object" ||
    Array.isArray(state) ||
    state.schemaVersion !== 1 ||
    !Array.isArray(state.actors) ||
    state.actors.length > 500 ||
    state.actors.some((actor) => !validActor(actor))
  ) {
    throw new RequestError(
      422,
      "Invalid actor state: expected schemaVersion 1 and at most 500 actors with a nonempty name, a description, an optional Primary or Supporting role, optional ID and aliases, and an optional boolean accepted flag.",
    );
  }
  for (const [archiveKey, activeKey, field] of [
    ["archivedActors", "actors", "name"],
    ["archivedUseCases", "useCases", "title"],
    ["archivedEntities", "entities", "name"],
  ]) {
    const archived = state[archiveKey] ?? [];
    if (
      (Object.hasOwn(state, archiveKey) && !Array.isArray(state[archiveKey])) ||
      archived.length > 5000 ||
      archived.some((item) => archiveKey === "archivedActors" ? !validActor(item) : !validFinding(item, field))
    ) {
      throw new RequestError(422, `Invalid ${archiveKey} state.`);
    }
    const ids = new Set();
    for (const item of [...(state[activeKey] ?? []), ...archived]) {
      if (item.id && ids.has(item.id)) {
        throw new RequestError(422, `Duplicate ${field} finding ID.`);
      }
      if (item.id) ids.add(item.id);
    }
    const activeActors = new Map(state.actors.filter((actor) => actor.id).map((actor) => [actor.id, actor]));
    for (const useCase of [...(state.useCases ?? []), ...(state.archivedUseCases ?? [])]) {
      if (!Object.hasOwn(useCase, "actorMentions")) continue;
      if (!Array.isArray(useCase.actorMentions) || useCase.actorMentions.length > 500) {
        throw new RequestError(422, "Invalid use-case actor mentions.");
      }
      const seen = new Set();
      for (const mention of useCase.actorMentions) {
        if (!mention || typeof mention !== "object" || typeof mention.actorId !== "string" ||
            typeof mention.label !== "string" || !mention.label.trim() || mention.label.length > 200 ||
            !labelRanges(useCase.description, mention.label, { caseSensitive: true }).length) {
          throw new RequestError(422, "Actor mentions must refer to text in the use-case description.");
        }
        const actor = activeActors.get(mention.actorId);
        if (!actor || actor.accepted !== true) {
          throw new RequestError(422, "Referenced actors must remain active and confirmed. Unlink them from active and archived use cases first.");
        }
        const key = JSON.stringify([mention.actorId, mention.label]);
        if (seen.has(key)) throw new RequestError(422, "Duplicate actor mention.");
        seen.add(key);
      }
    }
  }
}
