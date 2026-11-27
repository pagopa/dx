// Exercises actor persistence, table edits, and the loopback boundary.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { runInNewContext } from "node:vm";

import { createActorState } from "./actor-state.mjs";
import {
  actorIsReferenced,
  availableActorRanges,
  labelRanges,
  linkMatchingActors,
  mentionRanges,
} from "./actor-mentions.mjs";
import {
  initialGitHubRepositories,
  isValidGitHubRepository,
  isValidGitHubRepositories,
  parseGitHubRemote,
} from "./github-repository.mjs";
import { startServer } from "./server.mjs";
import { findUseCasesPrompt, syncPrompt } from "./sync-prompt.mjs";
import { createWorkspaceContext } from "./workspace-context.mjs";

const executeFile = promisify(execFile);

async function workspace(t) {
  const directory = await mkdtemp(join(tmpdir(), "brownfield-docs-"));
  t.after(() => rm(directory, { force: true, recursive: true }));
  return directory;
}

test("resolves repository identity and state path from the host workspace", async (t) => {
  const directory = await workspace(t);
  await executeFile("git", ["init", "--quiet"], { cwd: directory });
  await executeFile(
    "git",
    ["remote", "add", "origin", "https://github.com/pagopa/dx.git"],
    { cwd: directory },
  );

  const context = await createWorkspaceContext(directory);

  assert.equal(context.currentRepository, "pagopa/dx");
  assert.equal(
    (await context.actorState.read()).path,
    join(directory, "docs/brownfield/state.json"),
  );
});

test("requires an absolute host workspace path", async () => {
  await assert.rejects(
    createWorkspaceContext(undefined),
    /Copilot host did not provide an absolute checkout directory/,
  );
  await assert.rejects(
    createWorkspaceContext("relative/path"),
    /Copilot host did not provide an absolute checkout directory/,
  );
});

test("autosave serializes edits, waits for valid rows, and preserves conflicts", async () => {
  class Element {
    children = [];
    dataset = {};
    handlers = {};
    tagName;
    value = "";
    get lastElementChild() {
      return this.children.at(-1);
    }
    constructor(tagName) {
      this.tagName = tagName;
    }
    addEventListener(name, handler) {
      this.handlers[name] = handler;
    }
    append(child) {
      this.children.push(child);
    }
    click() {
      if (!this.disabled) this.handlers.click?.();
    }
    contains(element) {
      return this === element || this.querySelectorAll().includes(element);
    }
    focus() {
      this.focused = true;
    }
    querySelector(selector) {
      if (selector === ".row-actions button")
        return this.querySelector(".row-actions")?.querySelector("button");
      return this.querySelectorAll().find((element) =>
        selector.startsWith(".")
          ? element.className?.split(" ").includes(selector.slice(1))
          : element.tagName === selector,
      );
    }
    querySelectorAll() {
      return this.children.flatMap((child) => [
        child,
        ...child.querySelectorAll(),
      ]);
    }
    replaceChildren() {
      this.children = [];
    }
    setAttribute(name, value) {
      this[name] = value;
    }
  }
  const elements = new Map(
    [
      "actor-rows",
      "actor-status",
      "retry-save",
      "sync-code",
      "sync-status",
      "find-use-cases",
      "find-use-cases-hint",
      "find-use-cases-status",
      "generate-document",
      "document-status",
      "actor-path",
      "use-case-rows",
      "archived-actor-rows",
      "archived-use-case-rows",
      "findings-page",
      "archive-page",
      "show-findings",
      "show-archive",
      "use-cases-section",
      "repository-rows",
      "add-repository",
    ].map((id) => [`#${id}`, new Element()]),
  );
  const initial = {
    currentRepository: "pagopa/dx",
    path: "docs/brownfield/state.json",
    revision: "initial",
    state: {
      actors: [{ description: "Original", name: "Operator" }],
      schemaVersion: 1,
      sources: [{ url: "https://example.com/legacy" }],
      useCases: [
        {
          description: "Full\n<script>description</script>",
          title: "Bootstrap",
        },
      ],
    },
  };
  const submitted = [];
  const syncRequests = [];
  const findRequests = [];
  const documentRequests = [];
  let syncError;
  let releaseSync;
  let deferSync = false;
  let releaseFind;
  let deferFind = false;
  let findError;
  let releaseDocument;
  let documentError;
  let deferDocument = false;
  const pending = [];
  let timer;
  let refresh;
  const documentHandlers = {};
  const context = {
    clearTimeout: () => {
      timer = undefined;
    },
    actorIsReferenced,
    availableActorRanges,
    labelRanges,
    linkMatchingActors,
    mentionRanges,
    crypto: { randomUUID },
    document: {
      addEventListener: (name, handler) => {
        documentHandlers[name] = handler;
      },
      createElement: (tagName) => new Element(tagName),
      querySelector: (selector) => elements.get(selector),
    },
    fetch: async (url, options) => {
      if (url === "./generate-document") {
        documentRequests.push(JSON.parse(options.body));
        if (deferDocument)
          await new Promise((resolve) => {
            releaseDocument = resolve;
          });
        return documentError
          ? { json: async () => ({ error: documentError }), ok: false }
          : {
              json: async () => ({
                path: "/workspace/docs/brownfield/brownfield.md",
              }),
              ok: true,
            };
      }
      if (url === "./sync-code") {
        syncRequests.push(JSON.parse(options.body));
        if (deferSync)
          await new Promise((resolve) => {
            releaseSync = resolve;
          });
        return syncError
          ? { json: async () => ({ error: syncError }), ok: false }
          : { json: async () => ({ messageId: "message-1" }), ok: true };
      }
      if (url === "./find-use-cases") {
        findRequests.push(JSON.parse(options.body));
        if (deferFind)
          await new Promise((resolve) => {
            releaseFind = resolve;
          });
        return findError
          ? { json: async () => ({ error: findError }), ok: false }
          : { json: async () => ({ messageId: "message-2" }), ok: true };
      }
      if (!options?.body)
        return { json: async () => structuredClone(initial), ok: true };
      const input = JSON.parse(options.body);
      submitted.push(input);
      return new Promise((resolve) => pending.push(resolve));
    },
    initialGitHubRepositories,
    isValidGitHubRepository,
    isValidGitHubRepositories,
    setInterval: (callback) => {
      refresh = callback;
    },
    setTimeout: (callback) => {
      timer = callback;
      return 1;
    },
    window: {
      addEventListener: (name, handler) => elements.set(name, handler),
    },
  };
  runInNewContext(
    (await readFile(new URL("./actors.mjs", import.meta.url), "utf8"))
      .replace(/import \{[\s\S]*?\} from "\.\/github-repository\.mjs";/, "")
      .replace(/import \{[^\n]*\} from "\.\/actor-mentions\.mjs";/, ""),
    context,
  );
  await new Promise((resolve) => setImmediate(resolve));
  const flushTimer = async () => {
    assert.ok(timer, "expected a pending autosave");
    const callback = timer;
    timer = undefined;
    callback();
    await new Promise((resolve) => setImmediate(resolve));
  };
  const complete = async (index, error) => {
    pending[index](
      error
        ? { json: async () => ({ error }), ok: false }
        : {
            json: async () => ({
              ...submitted[index],
              path: initial.path,
              revision: `saved-${index + 1}`,
            }),
            ok: true,
          },
    );
    await new Promise((resolve) => setImmediate(resolve));
  };
  const nameInput = () =>
    elements.get("#actor-rows").children[0].children[0].children[1];
  const edit = (name) => {
    nameInput().value = name;
    nameInput().handlers.input();
  };
  assert.equal(nameInput().value, "Operator");
  assert.equal(elements.get("#repository-rows").children.length, 1);
  assert.equal(
    elements.get("#repository-rows").children[0].children[0].textContent,
    "No GitHub repositories yet. Add one to include its code as a source.",
  );
  assert.equal(timer, undefined);
  assert.equal(elements.get("#find-use-cases").disabled, true);
  assert.equal(elements.get("#find-use-cases-hint").hidden, false);
  deferDocument = true;
  const documentPending = elements.get("#generate-document").handlers.click();
  assert.equal(elements.get("#generate-document").disabled, true);
  assert.equal(elements.get("#sync-code").disabled, true);
  assert.deepEqual(documentRequests[0], { revision: "initial" });
  releaseDocument();
  await documentPending;
  deferDocument = false;
  assert.match(elements.get("#document-status").textContent, /brownfield\.md/);
  assert.equal(elements.get("#generate-document").disabled, false);
  documentError = "State changed";
  await elements.get("#generate-document").handlers.click();
  assert.match(elements.get("#document-status").textContent, /State changed/);
  documentError = undefined;
  assert.equal(syncRequests.length, 0);
  assert.equal(submitted.length, 0);
  deferSync = true;
  const syncPending = elements.get("#sync-code").handlers.click();
  assert.equal(elements.get("#sync-code").disabled, true);
  assert.deepEqual(syncRequests[0], { revision: "initial" });
  releaseSync();
  await syncPending;
  deferSync = false;
  assert.match(elements.get("#sync-status").textContent, /submitted/);
  assert.equal(elements.get("#sync-code").disabled, false);
  syncError = "Session disconnected";
  await elements.get("#sync-code").handlers.click();
  assert.match(
    elements.get("#sync-status").textContent,
    /Session disconnected/,
  );
  syncError = undefined;
  const firstActorAccept =
    elements.get("#actor-rows").children[0].children[2].children[0].children[2];
  assert.equal(firstActorAccept["aria-pressed"], "false");
  assert.equal(firstActorAccept.textContent, "Confirm");
  assert.equal(
    elements.get("#actor-rows").children[0].dataset.confirmed,
    "false",
  );
  firstActorAccept.click();
  assert.equal(firstActorAccept["aria-pressed"], "true");
  assert.equal(firstActorAccept.textContent, "Confirmed");
  assert.equal(
    elements.get("#actor-rows").children[0].dataset.confirmed,
    "true",
  );
  assert.equal(elements.get("#sync-code").disabled, true);
  assert.equal(elements.get("#find-use-cases").disabled, true);
  assert.equal(elements.get("#find-use-cases-hint").hidden, true);
  assert.equal(submitted.length, 0);
  const firstActor = elements.get("#actor-rows").children[0];
  assert.equal(firstActor.children[1].children.length, 2);
  const firstEdit = firstActor.children[2].children[0].children[0];
  const firstRemove = firstActor.children[2].children[0].children[1];
  assert.equal(firstEdit.disabled, true);
  assert.equal(firstRemove.disabled, true);
  assert.equal(nameInput().disabled, true);
  firstEdit.click();
  firstRemove.click();
  assert.notEqual(firstActor.dataset.editing, "true");
  assert.equal(elements.get("#actor-rows").children.length, 1);
  firstActorAccept.click();
  assert.equal(firstEdit.disabled, false);
  assert.equal(firstRemove.disabled, false);
  firstEdit.click();
  assert.equal(firstActor.dataset.editing, "true");
  const roleEditor = firstActor.children[0].children[3];
  assert.equal(
    firstActor.children[0].children[2].textContent,
    "Role: Unspecified",
  );
  roleEditor.value = "Primary";
  roleEditor.handlers.change();
  assert.equal(firstActor.children[0].children[2].textContent, "Role: Primary");
  assert.equal(firstActorAccept["aria-pressed"], "false");
  assert.equal(firstEdit.textContent, "Done");
  assert.equal(nameInput().focused, true);
  documentHandlers.pointerdown({ target: elements.get("#sync-code") });
  assert.equal(firstActor.dataset.editing, "false");
  assert.equal(firstEdit.textContent, "Edit");
  assert.equal(firstActorAccept["aria-pressed"], "false");
  firstEdit.click();
  firstEdit.click();
  assert.equal(firstActor.dataset.editing, "false");
  assert.equal(firstActorAccept["aria-pressed"], "false");
  assert.equal(firstActorAccept["aria-pressed"], "false");
  assert.equal(elements.get("#sync-code").disabled, true);
  firstEdit.click();
  assert.equal(firstActor.dataset.editing, "true");
  firstActorAccept.click();
  assert.equal(firstActor.dataset.editing, "false");
  assert.equal(firstEdit.disabled, true);
  assert.equal(firstActorAccept["aria-pressed"], "true");
  assert.equal(elements.get("#sync-code").disabled, true);
  const caseRow = elements.get("#use-case-rows").children[0];
  const titleValue = caseRow.children[0].children[0];
  const title = caseRow.children[0].children[1];
  const descriptionValue = caseRow.children[1].children[0];
  const description = caseRow.children[1].children[1];
  assert.equal(caseRow.children[1].children.length, 3);
  const caseActions = caseRow.children[2].children[0];
  const caseEdit = caseActions.children[0];
  const caseRemove = caseActions.children[1];
  const caseAccept = caseActions.children[2];
  assert.equal(titleValue.textContent, "Bootstrap");
  assert.equal(titleValue.className, "row-value actor-name");
  assert.equal(descriptionValue.className, "row-value actor-description");
  assert.equal(caseRow.dataset.confirmed, "false");
  assert.equal(caseAccept.textContent, "Confirm");
  assert.equal(caseAccept["aria-pressed"], "false");
  assert.equal(description.value, "Full\n<script>description</script>");
  assert.equal(
    descriptionValue.textContent,
    "Full\n<script>description</script>",
  );
  caseEdit.click();
  assert.equal(caseRow.dataset.editing, "true");
  assert.equal(title.focused, true);
  caseAccept.click();
  assert.equal(caseRow.dataset.editing, "false");
  assert.equal(caseEdit.disabled, true);
  caseAccept.click();
  assert.equal(caseEdit.disabled, false);
  caseEdit.click();
  documentHandlers.pointerdown({
    target:
      elements.get("#actor-rows").children[0].children[2].children[0]
        .children[0],
  });
  assert.equal(caseRow.dataset.editing, "false");
  caseEdit.click();
  assert.equal(caseRow.dataset.editing, "true");
  description.value = "Updated full description";
  description.handlers.input();
  assert.equal(descriptionValue.textContent, "Updated full description");
  documentHandlers.pointerdown({ target: nameInput() });
  firstActorAccept.click();
  elements
    .get("#actor-rows")
    .children[0].children[2].children[0].children[0].click();
  edit("Maintainer");
  assert.equal(
    elements.get("#actor-rows").children[0].children[2].children[0].children[2][
      "aria-pressed"
    ],
    "false",
  );
  assert.equal(
    elements.get("#actor-rows").children[0].dataset.confirmed,
    "false",
  );
  assert.equal(description.disabled, false);
  await flushTimer();
  edit("Reviewer");
  assert.equal(submitted.length, 1);
  await complete(0);
  assert.equal(nameInput().value, "Reviewer");
  await flushTimer();
  assert.equal(submitted[1].state.actors[0].name, "Reviewer");
  assert.deepEqual(submitted[1].state.actors[0].aliases, [
    "Operator",
    "Maintainer",
  ]);
  assert.match(submitted[1].state.actors[0].id, /^[0-9a-f-]{36}$/);
  assert.equal(Object.hasOwn(submitted[1].state.actors[0], "evidence"), false);
  assert.equal(submitted[1].revision, "saved-1");
  assert.equal(submitted[1].state.actors[0].accepted, false);
  assert.equal(submitted[1].state.actors[0].role, "Primary");
  assert.equal(submitted[1].state.useCases[0].accepted, false);
  assert.equal(
    Object.hasOwn(submitted[1].state.useCases[0], "evidence"),
    false,
  );
  assert.equal(
    submitted[1].state.useCases[0].description,
    "Updated full description",
  );
  await complete(1);
  edit("Unsaved");
  assert.equal(elements.get("#sync-code").disabled, true);
  assert.equal(elements.get("#generate-document").disabled, true);
  await flushTimer();
  await complete(2, "State changed since it was loaded.");
  assert.equal(nameInput().value, "Unsaved");
  assert.match(elements.get("#actor-status").textContent, /State changed/);
  assert.equal(elements.get("#retry-save").hidden, false);
  assert.equal(elements.get("#sync-code").disabled, true);
  elements.get("#retry-save").handlers.click();
  await flushTimer();
  await complete(3);
  assert.equal(elements.get("#retry-save").hidden, true);
  assert.equal(elements.get("#sync-code").disabled, false);
  const actorAccept =
    elements.get("#actor-rows").children[0].children[2].children[0].children[2];
  actorAccept.click();
  caseAccept.click();
  assert.equal(caseAccept.textContent, "Confirmed");
  assert.equal(caseAccept["aria-pressed"], "true");
  assert.equal(caseRow.dataset.confirmed, "true");
  assert.equal(caseEdit.disabled, true);
  assert.equal(caseRemove.disabled, true);
  assert.equal(description.disabled, true);
  caseEdit.click();
  caseRemove.click();
  assert.notEqual(caseRow.dataset.editing, "true");
  assert.equal(elements.get("#use-case-rows").children.length, 1);
  documentHandlers.focusin({ target: actorAccept });
  assert.equal(caseAccept["aria-pressed"], "true");
  assert.equal(caseRow.dataset.editing, "false");
  actorAccept.click();
  assert.equal(firstEdit.disabled, false);
  edit("Updated actor");
  assert.equal(caseAccept["aria-pressed"], "true");
  assert.equal(caseAccept.disabled, false);
  actorAccept.click();
  assert.equal(caseAccept.disabled, false);
  assert.equal(caseEdit.disabled, true);
  caseAccept.click();
  assert.equal(caseEdit.disabled, false);
  assert.equal(caseRemove.disabled, false);
  description.value = "Edited after acceptance";
  description.handlers.input();
  assert.equal(caseAccept["aria-pressed"], "false");
  caseEdit.click();
  title.value = "";
  title.handlers.input();
  assert.equal(timer, undefined);
  assert.match(elements.get("#actor-status").textContent, /title/);
  assert.equal(caseAccept.disabled, true);
  assert.equal(caseRow.dataset.editing, "true");
  assert.equal(title.focused, true);
  documentHandlers.pointerdown({ target: elements.get("#sync-code") });
  assert.equal(caseRow.dataset.editing, "false");
  assert.equal(titleValue.textContent, "Untitled use case");
  caseEdit.click();
  title.value = "New case";
  title.handlers.input();
  assert.equal(titleValue.textContent, "New case");
  await flushTimer();
  assert.equal(submitted[4].state.useCases[0].title, "New case");
  assert.equal(submitted[4].state.actors[0].accepted, true);
  assert.equal(submitted[4].state.useCases[0].accepted, false);
  await complete(4);
  assert.equal(elements.get("#find-use-cases").disabled, false);
  deferFind = true;
  const findPending = elements.get("#find-use-cases").handlers.click();
  assert.equal(elements.get("#find-use-cases").disabled, true);
  assert.equal(elements.get("#sync-code").disabled, true);
  assert.deepEqual(findRequests[0], { revision: "saved-5" });
  releaseFind();
  await findPending;
  deferFind = false;
  assert.match(elements.get("#find-use-cases-status").textContent, /submitted/);
  assert.equal(elements.get("#find-use-cases").disabled, false);
  findError = "Session disconnected";
  await elements.get("#find-use-cases").handlers.click();
  assert.match(
    elements.get("#find-use-cases-status").textContent,
    /Session disconnected/,
  );
  findError = undefined;
  caseRemove.click();
  assert.match(
    elements.get("#use-case-rows").children[0].children[0].textContent,
    /Sync from source code/,
  );
  elements.get("#show-archive").click();
  assert.equal(elements.get("#archive-page").hidden, false);
  assert.equal(elements.get("#findings-page").hidden, true);
  assert.equal(elements.get("#show-archive")["aria-pressed"], "true");
  const archivedCase = elements.get("#archived-use-case-rows").children[0];
  assert.equal(archivedCase.children[0].children[0].textContent, "New case");
  await flushTimer();
  assert.equal(submitted[5].state.archivedUseCases[0].title, "New case");
  assert.deepEqual(submitted[5].state.archivedUseCases[0].aliases, [
    "Bootstrap",
  ]);
  await complete(5);
  assert.equal(
    elements.get("#actor-status").textContent,
    "State saved to the repository file.",
  );
  archivedCase.children[2].children[0].children[0].click();
  assert.equal(
    elements.get("#use-case-rows").children[0].children[0].children[0]
      .textContent,
    "New case",
  );
  assert.match(
    elements.get("#archived-use-case-rows").children[0].children[0].textContent,
    /No removed/,
  );
  elements.get("#show-findings").click();
  assert.equal(elements.get("#archive-page").hidden, true);
  assert.equal(elements.get("#findings-page").hidden, false);
  await flushTimer();
  assert.deepEqual(submitted[6].state.sources, [
    { url: "https://example.com/legacy" },
  ]);
  assert.equal(submitted[6].state.archivedUseCases.length, 0);
  assert.equal(submitted[6].state.useCases[0].title, "New case");
  assert.equal(
    submitted[6].state.useCases[0].id,
    submitted[5].state.archivedUseCases[0].id,
  );
  await complete(6);
  assert.equal(elements.get("#add-repository").disabled, false);
  elements.get("#add-repository").handlers.click();
  let repositoryRow = elements.get("#repository-rows").children[0];
  let repositoryInput = repositoryRow.children[0].children[1];
  assert.equal(repositoryRow.dataset.editing, "true");
  assert.equal(repositoryInput.focused, true);
  assert.equal(timer, undefined);
  repositoryInput.value = "not-a-repository";
  repositoryInput.handlers.input();
  assert.equal(repositoryInput["aria-invalid"], "true");
  assert.equal(timer, undefined);
  repositoryInput.value = "pagopa/documentation";
  repositoryInput.handlers.input();
  assert.equal(repositoryInput["aria-invalid"], "false");
  elements.get("#add-repository").click();
  repositoryRow = elements.get("#repository-rows").children[0];
  repositoryInput = repositoryRow.children[0].children[1];
  const secondRepositoryRow = elements.get("#repository-rows").children[1];
  const secondRepositoryInput = secondRepositoryRow.children[0].children[1];
  assert.equal(repositoryInput["aria-invalid"], "false");
  assert.equal(repositoryRow.children[0].children[2].textContent, "");
  secondRepositoryInput.value = "no-owner";
  secondRepositoryInput.handlers.input();
  assert.equal(secondRepositoryInput["aria-invalid"], "true");
  assert.equal(repositoryInput["aria-invalid"], "false");
  assert.equal(timer, undefined);
  assert.equal(elements.get("#sync-code").disabled, true);
  secondRepositoryInput.value = "PAGOPA/documentation";
  secondRepositoryInput.handlers.input();
  assert.equal(repositoryInput["aria-invalid"], "true");
  assert.equal(secondRepositoryInput["aria-invalid"], "true");
  assert.match(
    secondRepositoryRow.children[0].children[2].textContent,
    /more than once/,
  );
  assert.equal(timer, undefined);
  secondRepositoryInput.value = "microsoft/vscode";
  secondRepositoryInput.handlers.input();
  assert.equal(repositoryInput["aria-invalid"], "false");
  assert.equal(secondRepositoryInput["aria-invalid"], "false");
  secondRepositoryRow.children[1].children[0].children[1].click();
  repositoryRow = elements.get("#repository-rows").children[0];
  await flushTimer();
  assert.deepEqual(submitted[7].state.repositories, [
    { fullName: "pagopa/documentation" },
  ]);
  await complete(7);
  assert.equal(
    repositoryRow.children[0].children[0].textContent,
    "pagopa/documentation",
  );
  documentHandlers.pointerdown({ target: elements.get("#sync-code") });
  await elements.get("#sync-code").handlers.click();
  assert.deepEqual(syncRequests.at(-1), { revision: "saved-8" });
  assert.match(elements.get("#sync-status").textContent, /submitted/);
  initial.revision = "external-update";
  initial.state.actors.push({
    name: "Reader",
    description: "",
    accepted: false,
  });
  initial.state.archivedActors = [
    { name: "Reader", description: "Archived", accepted: false },
  ];
  refresh();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(elements.get("#actor-rows").children.length, 2);
  assert.equal(
    elements.get("#actor-status").textContent,
    "Repository state updated.",
  );
  elements
    .get("#archived-actor-rows")
    .children[0].children[2].children[0].children[0].click();
  assert.match(elements.get("#actor-status").textContent, /Cannot restore/);
  assert.equal(elements.get("#archived-actor-rows").children.length, 1);
  for (const row of elements.get("#actor-rows").children) {
    row.children[2].children[0].children[2].click();
    assert.equal(row.dataset.confirmed, "true");
    assert.equal(
      row.children[2].children[0].children[2]["aria-pressed"],
      "true",
    );
  }
  assert.equal(elements.get("#sync-code").disabled, true);
  await flushTimer();
  await complete(8);
  assert.equal(elements.get("#sync-code").disabled, false);
  await elements.get("#sync-code").handlers.click();
  assert.deepEqual(syncRequests.at(-1), { revision: "saved-9" });
  const actorRow = elements.get("#actor-rows").children[0];
  actorRow.children[2].children[0].children[2].click();
  actorRow.children[2].children[0].children[1].click();
  const archivedActor = elements.get("#archived-actor-rows").children[1];
  assert.equal(archivedActor.children[0].children[0].textContent, "Operator");
  assert.equal(
    archivedActor.children[0].children[1].textContent,
    "Role: Unspecified",
  );
  archivedActor.children[2].children[0].children[0].click();
  await flushTimer();
  assert.equal(submitted[9].state.archivedActors.length, 1);
  assert.equal(submitted[9].state.actors.at(-1).name, "Operator");
  assert.match(submitted[9].state.actors.at(-1).id, /^[0-9a-f-]{36}$/);
  await complete(9);
  initial.revision = "entity-update";
  initial.state.entities = [
    { name: "Repository", description: "A code repository.", accepted: false },
  ];
  initial.state.archivedEntities = [
    {
      name: "Old project",
      description: "Previously removed.",
      accepted: false,
    },
  ];
  refresh();
  await new Promise((resolve) => setImmediate(resolve));

  initial.revision = "mentions-update";
  initial.state.actors = [
    { name: "Operator", description: "", accepted: true },
    { name: "Reviewer", description: "", accepted: false },
  ];
  initial.state.useCases = [
    {
      title: "Review",
      description: "Operator asks Reviewer.",
      accepted: false,
    },
  ];
  initial.state.archivedUseCases = [
    { title: "Run", description: "Operator runs it.", accepted: false },
  ];
  refresh();
  await new Promise((resolve) => setImmediate(resolve));
  let operatorRow = elements.get("#actor-rows").children[0];
  let operatorConfirm = operatorRow.children[2].children[0].children[2];
  let review = elements.get("#use-case-rows").children[0];
  assert.equal(operatorConfirm.disabled, true);
  assert.match(operatorConfirm.title, /active and archived use cases/);
  assert.equal(
    review.children[1].children[0].children[1].textContent,
    "Operator",
  );
  review.children[1].children[0].children[1].click();
  assert.equal(operatorRow.focused, true);
  assert.equal(operatorRow.dataset.highlighted, "true");
  operatorRow.handlers.animationend({
    target: operatorRow,
    animationName: "actor-row-highlight",
  });
  assert.equal(operatorRow.dataset.highlighted, undefined);
  review.children[1].children[0].children[1].click();
  assert.equal(operatorRow.dataset.highlighted, "true");
  await flushTimer();
  assert.equal(
    submitted[10].state.useCases[0].actorMentions[0].actorId,
    submitted[10].state.actors[0].id,
  );
  assert.equal(
    submitted[10].state.archivedUseCases[0].actorMentions[0].label,
    "Operator",
  );
  assert.equal(submitted[10].state.entities[0].name, "Repository");
  assert.equal(submitted[10].state.archivedEntities[0].name, "Old project");
  await complete(10);

  review.children[2].children[0].children[0].click();
  review.children[1].children[2].children[0].click();
  assert.equal(
    operatorConfirm.disabled,
    true,
    "archived use case still references the actor",
  );
  elements
    .get("#archived-use-case-rows")
    .children[0].children[2].children[0].children[0].click();
  operatorRow = elements.get("#actor-rows").children[0];
  operatorConfirm = operatorRow.children[2].children[0].children[2];
  const restoredCase = elements.get("#use-case-rows").children[1];
  restoredCase.children[2].children[0].children[0].click();
  restoredCase.children[1].children[2].children[0].click();
  assert.equal(operatorConfirm.disabled, false);
  operatorConfirm.click();
  review = elements.get("#use-case-rows").children[0];
  assert.equal(
    review.children[1].children[2].children.length,
    0,
    "unconfirmed actors cannot be linked",
  );
  elements
    .get("#actor-rows")
    .children[1].children[2].children[0].children[2].click();
  const mentionControls = review.children[1].children[2];
  assert.equal(mentionControls.children[0].children[1].textContent, "Reviewer");
  mentionControls.children[0].value = "1";
  mentionControls.children[1].click();
  assert.equal(
    elements.get("#actor-rows").children[1].children[2].children[0].children[2]
      .disabled,
    true,
  );
  assert.equal(
    review.children[1].children[0].children[1].textContent,
    "Reviewer",
  );
  await flushTimer();
  assert.deepEqual(
    submitted[11].state.useCases[0].actorMentions.map(({ label }) => label),
    ["Reviewer"],
  );
  assert.deepEqual(submitted[11].state.useCases[1].actorMentions, []);
  await complete(11);
});

test("legacy actor matching handles ambiguity, overlapping names, and removed links", () => {
  const state = {
    actors: [
      { name: "Operator", accepted: true },
      { name: "Senior Operator", accepted: true },
      { name: "Reader", accepted: true },
      { name: "reader", accepted: true },
      { name: "Guest", accepted: false },
    ],
  };
  const cases = [
    { description: "Senior Operator and Operator meet Reader and Guest." },
    { description: "Operator.", actorMentions: [] },
  ];
  let count = 0;
  assert.equal(
    linkMatchingActors(state, cases, () => `id-${++count}`),
    true,
  );
  assert.deepEqual(
    cases[0].actorMentions.map((mention) => mention.label),
    ["Senior Operator", "Operator"],
  );
  assert.deepEqual(cases[1].actorMentions, []);
  assert.equal(
    actorIsReferenced({ ...state, useCases: cases }, state.actors[0].id),
    true,
  );
  assert.equal(state.actors[2].id, undefined);
  state.actors[1].name = "Lead Operator";
  const ranges = mentionRanges(
    cases[0].description,
    cases[0].actorMentions,
    state.actors,
  );
  assert.equal(ranges[0].actor.name, "Lead Operator");
  assert.equal(
    labelRanges("Cooperator Operator2 Operator.", "Operator").length,
    1,
  );
});

test("sync links confirmed actors and validates links across active and archived cases", async (t) => {
  const store = createActorState(join(await workspace(t), "state.json"));
  const initial = await store.save({
    revision: null,
    state: {
      schemaVersion: 1,
      actors: [
        { name: "Operator", description: "", accepted: true },
        { name: "Senior Operator", description: "", accepted: true },
        { name: "Guest", description: "", accepted: false },
      ],
      useCases: [],
    },
  });
  for (const actorNames of [
    ["Guest"],
    ["Missing"],
    ["Operator", "Guest"],
    [],
  ]) {
    await assert.rejects(
      store.addFindings({
        revision: initial.revision,
        actors: [],
        useCases: [
          { title: "Run", description: "Operator and Guest run.", actorNames },
        ],
      }),
      { status: 422 },
    );
  }
  await assert.rejects(
    store.addFindings({
      revision: initial.revision,
      actors: [],
      useCases: [
        {
          title: "Run",
          description: "Someone runs.",
          actorNames: ["Operator"],
        },
      ],
    }),
    { status: 422 },
  );
  const added = await store.addFindings({
    revision: initial.revision,
    actors: [],
    useCases: [
      { title: "Run", description: "Operator runs.", actorNames: ["Operator"] },
    ],
  });
  const actor = added.state.actors[0];
  assert.match(actor.id, /^[0-9a-f-]{36}$/);
  assert.deepEqual(added.state.useCases[0].actorMentions, [
    { actorId: actor.id, label: "Operator" },
  ]);
  assert.equal(Object.hasOwn(added.state.useCases[0], "actorNames"), false);
  const overlapping = await store.addFindings({
    revision: added.revision,
    actors: [],
    useCases: [
      {
        title: "Meet",
        description: "Senior Operator meets Operator.",
        actorNames: ["Operator", "Senior Operator"],
      },
    ],
  });
  assert.deepEqual(
    overlapping.state.useCases[1].actorMentions,
    [
      {
        actorId: overlapping.state.actors[1].id,
        label: "Senior Operator",
      },
      { actorId: overlapping.state.actors[0].id, label: "Operator" },
    ],
  );
  await assert.rejects(
    store.addFindings({ revision: initial.revision, actors: [], useCases: [] }),
    { status: 409 },
  );
  await assert.rejects(
    store.save({
      revision: overlapping.revision,
      state: {
        ...overlapping.state,
        actors: [{ ...actor, accepted: false }, overlapping.state.actors[1]],
      },
    }),
    { status: 422 },
  );
  const archived = await store.save({
    revision: overlapping.revision,
    state: {
      ...overlapping.state,
      useCases: [],
      archivedUseCases: overlapping.state.useCases,
    },
  });
  await assert.rejects(
    store.save({
      revision: archived.revision,
      state: {
        ...archived.state,
        actors: [{ ...actor, accepted: false }, overlapping.state.actors[1]],
      },
    }),
    { status: 422 },
  );
  const renamed = await store.save({
    revision: archived.revision,
    state: {
      ...archived.state,
      actors: [{ ...actor, name: "Maintainer" }, overlapping.state.actors[1]],
    },
  });
  assert.equal(
    mentionRanges(
      renamed.state.archivedUseCases[0].description,
      renamed.state.archivedUseCases[0].actorMentions,
      renamed.state.actors,
    )[0].actor.name,
    "Maintainer",
  );
});

test("sync rewords existing use cases for confirmed actor renames atomically", async (t) => {
  const store = createActorState(join(await workspace(t), "state.json"));
  const initial = await store.save({
    revision: null,
    state: {
      schemaVersion: 1,
      repositories: [{ fullName: "pagopa/dx" }],
      actors: [
        { id: "operator", name: "Operator", description: "", accepted: true },
        {
          id: "csp",
          name: "CSP",
          aliases: ["Microsoft Azure"],
          description: "",
          accepted: true,
        },
        { id: "guest", name: "Guest", description: "", accepted: false },
      ],
      useCases: [
        {
          id: "review",
          title: "Review Microsoft Azure",
          accepted: true,
          description: "Operator reviews Microsoft Azure.",
          actorMentions: [
            { actorId: "operator", label: "Operator" },
            { actorId: "csp", label: "Microsoft Azure" },
          ],
          custom: "preserved",
        },
      ],
      archivedUseCases: [
        {
          id: "archive",
          title: "Old",
          description: "Microsoft Azure.",
          accepted: false,
        },
      ],
    },
  });
  const update = {
    useCaseId: "review",
    originalTitle: "Review Microsoft Azure",
    title: "Review cloud resources",
    description: "Operator reviews resources supplied by CSP.",
    renamedActorName: "CSP",
    actorNames: ["Operator", "CSP"],
  };
  await assert.rejects(
    store.addFindings({
      revision: initial.revision,
      actors: [],
      useCases: [],
      useCaseUpdates: [{ ...update, actorNames: ["CSP"] }],
    }),
    { status: 422 },
  );
  await assert.rejects(
    store.addFindings({
      revision: initial.revision,
      actors: [],
      useCases: [],
      useCaseUpdates: [{ ...update, renamedActorName: "Guest" }],
    }),
    { status: 422 },
  );
  await assert.rejects(
    store.addFindings({
      revision: initial.revision,
      actors: [{ name: "Operator", description: "" }],
      useCases: [],
      useCaseUpdates: [update],
    }),
    { status: 422 },
  );
  const unchanged = await store.addFindings({
    revision: initial.revision,
    actors: [],
    useCases: [],
    useCaseUpdates: [
      {
        ...update,
        title: update.originalTitle,
        description: initial.state.useCases[0].description,
      },
    ],
  });
  assert.deepEqual(unchanged, initial);
  assert.deepEqual(await store.read(), initial);

  const result = await store.addFindings({
    revision: initial.revision,
    actors: [],
    useCases: [],
    useCaseUpdates: [update],
    sourceUpdates: [
      {
        kind: "useCase",
        id: "review",
        name: update.originalTitle,
        sourceRevisions: [{ fullName: "pagopa/dx", sha: "a".repeat(40) }],
      },
    ],
  });
  assert.equal(result.state.useCases[0].accepted, false);
  assert.equal(result.state.useCases[0].title, update.title);
  assert.equal(result.state.useCases[0].description, update.description);
  assert.deepEqual(result.state.useCases[0].sourceRevisions, [
    { fullName: "pagopa/dx", sha: "a".repeat(40) },
  ]);
  assert.equal(result.state.useCases[0].custom, "preserved");
  assert.deepEqual(result.state.useCases[0].aliases, [
    "Review Microsoft Azure",
  ]);
  assert.deepEqual(result.state.useCases[0].actorMentions, [
    { actorId: "operator", label: "Operator" },
    { actorId: "csp", label: "CSP" },
  ]);
  assert.deepEqual(
    result.state.archivedUseCases,
    initial.state.archivedUseCases,
  );
  assert.deepEqual(result.state.repositories, initial.state.repositories);
  await assert.rejects(
    store.addFindings({
      revision: initial.revision,
      actors: [],
      useCases: [],
      useCaseUpdates: [update],
    }),
    { status: 409 },
  );
  assert.deepEqual(await store.read(), result);
});

test("sync updates legacy use cases only when their original title is unambiguous", async (t) => {
  const store = createActorState(join(await workspace(t), "state.json"));
  const initial = await store.save({
    revision: null,
    state: {
      schemaVersion: 1,
      actors: [
        { name: "CSP", aliases: ["Azure"], description: "", accepted: true },
      ],
      useCases: [
        {
          title: "Inspect Azure",
          description: "Azure provides data.",
          accepted: true,
        },
      ],
    },
  });
  const update = {
    originalTitle: "Inspect Azure",
    title: "Inspect cloud data",
    description: "CSP provides data.",
    renamedActorName: "CSP",
    actorNames: ["CSP"],
  };
  const result = await store.addFindings({
    revision: initial.revision,
    actors: [],
    useCases: [],
    useCaseUpdates: [update],
  });
  assert.match(result.state.useCases[0].id, /^[0-9a-f-]{36}$/);
  assert.equal(result.state.useCases[0].accepted, false);
  assert.equal(result.state.useCases[0].actorMentions[0].label, "CSP");
});

test("sync rejects ambiguous legacy use case titles without changing state", async (t) => {
  const store = createActorState(join(await workspace(t), "state.json"));
  const initial = await store.save({
    revision: null,
    state: {
      schemaVersion: 1,
      actors: [
        { name: "CSP", aliases: ["Azure"], description: "", accepted: true },
      ],
      useCases: [
        {
          title: "Inspect Azure",
          description: "Azure provides data.",
          accepted: true,
        },
        {
          title: "Inspect Azure",
          description: "Azure provides other data.",
          accepted: false,
        },
      ],
    },
  });
  await assert.rejects(
    store.addFindings({
      revision: initial.revision,
      actors: [],
      useCases: [],
      useCaseUpdates: [
        {
          originalTitle: "Inspect Azure",
          title: "Inspect cloud data",
          description: "CSP provides data.",
          renamedActorName: "CSP",
          actorNames: ["CSP"],
        },
      ],
    }),
    { status: 422 },
  );
  assert.deepEqual(await store.read(), initial);
});

test("GitHub repository sources remain empty unless explicitly added", () => {
  assert.deepEqual(initialGitHubRepositories(undefined, "pagopa/dx"), []);
  assert.deepEqual(initialGitHubRepositories([], "pagopa/dx"), []);
  assert.deepEqual(initialGitHubRepositories(undefined, null), []);
  assert.equal(
    isValidGitHubRepositories([
      { fullName: "pagopa/dx" },
      { fullName: "microsoft/vscode" },
      { fullName: "pagopa/.github" },
    ]),
    true,
  );
  assert.equal(isValidGitHubRepository("pagopa/."), false);
  assert.equal(isValidGitHubRepository("pagopa/.."), false);
  assert.equal(
    isValidGitHubRepositories([
      { fullName: "pagopa/dx" },
      { fullName: "PAGOPA/DX" },
    ]),
    false,
  );
  assert.equal(
    parseGitHubRemote("https://user:token@github.com/pagopa/dx.git"),
    "pagopa/dx",
  );
  assert.equal(parseGitHubRemote("git@github.com:pagopa/dx.git"), "pagopa/dx");
  assert.equal(
    parseGitHubRemote("https://github.com/pagopa/.github.git"),
    "pagopa/.github",
  );
  assert.equal(parseGitHubRemote("https://example.com/pagopa/dx.git"), null);
});

test("actor state survives a new session store and preserves other state fields", async (t) => {
  const statePath = join(await workspace(t), "nested", "state.json");
  const first = createActorState(statePath);
  const reopened = createActorState(statePath);
  const [initial, concurrent] = await Promise.all([
    first.read(),
    reopened.read(),
  ]);
  assert.deepEqual(concurrent, initial);
  assert.match(initial.revision, /^[0-9a-f]{64}$/);
  assert.deepEqual(initial.state, {
    actors: [],
    repositories: [],
    schemaVersion: 1,
    useCases: [],
  });
  assert.deepEqual(
    JSON.parse(await readFile(statePath, "utf8")),
    initial.state,
  );
  const state = {
    actors: [
      { accepted: true, description: "Handles incidents.", name: "Operator" },
    ],
    notes: { scope: "API" },
    schemaVersion: 1,
    sources: [{ url: "https://example.com/docs" }],
    useCases: [
      { accepted: false, description: "Build and release.", title: "Deploy" },
    ],
  };
  const saved = await first.save({ revision: initial.revision, state });
  assert.deepEqual(await reopened.read(), saved);
  const edited = {
    ...state,
    actors: [{ description: "Ships fixes.", name: "Maintainer" }],
  };
  const updated = await reopened.save({
    revision: saved.revision,
    state: edited,
  });
  assert.deepEqual(JSON.parse(await readFile(statePath, "utf8")), edited);
  await reopened.save({
    revision: updated.revision,
    state: { ...edited, actors: [] },
  });
  assert.deepEqual((await first.read()).state.actors, []);
});

test("sync appends unaccepted findings regardless of actor confirmation", async (t) => {
  const state = createActorState(join(await workspace(t), "state.json"));
  const initial = await state.save({
    revision: null,
    state: {
      schemaVersion: 1,
      actors: [{ name: "Operator", description: "Existing", accepted: true }],
      sources: [{ url: "https://example.com/docs" }],
      useCases: [{ title: "Deploy", description: "Existing", accepted: true }],
      notes: "Preserved",
    },
  });
  const added = await state.addFindings({
    revision: initial.revision,
    actors: [],
    useCases: [{ title: "Investigate", description: "Review findings" }],
  });
  assert.deepEqual(added.state.useCases[1], {
    id: added.state.useCases[1].id,
    title: "Investigate",
    description: "Review findings",
    accepted: false,
  });
  assert.match(added.state.useCases[1].id, /^[0-9a-f-]{36}$/);
  assert.equal(added.state.notes, "Preserved");
  assert.deepEqual(added.state.sources, initial.state.sources);
  assert.deepEqual(added.state.actors, initial.state.actors);
  await assert.rejects(
    state.addFindings({
      revision: initial.revision,
      actors: [],
      useCases: [],
    }),
    { status: 409 },
  );
  await assert.rejects(
    state.addFindings({
      revision: added.revision,
      actors: [{ name: "operator", description: "" }],
      useCases: [],
    }),
    { status: 422 },
  );
  const withActor = await state.addFindings({
    revision: added.revision,
    actors: [{ name: "Reader", description: "" }],
    useCases: [{ title: "Read", description: "Read the information." }],
  });
  assert.equal(withActor.state.actors[1].accepted, false);
  assert.equal(Object.hasOwn(withActor.state.actors[1], "evidence"), false);
  assert.equal(withActor.state.useCases[2].accepted, false);
  const withUseCase = await state.addFindings({
    revision: withActor.revision,
    actors: [],
    useCases: [{ title: "Read more", description: "Read more information." }],
  });
  assert.deepEqual(await state.read(), withUseCase);
});

test("sync limits inferred descriptions to five sentences without changing existing or edited use cases", async (t) => {
  const state = createActorState(join(await workspace(t), "state.json"));
  const sixSentences =
    "Operator starts. They select. They review. They confirm. They wait. They finish.";
  const initial = await state.save({
    revision: null,
    state: {
      schemaVersion: 1,
      actors: [{ name: "Operator", description: "", accepted: true }],
      useCases: [
        { title: "Existing", description: sixSentences, accepted: true },
      ],
    },
  });
  for (const description of [" ", sixSentences]) {
    await assert.rejects(
      state.addFindings({
        revision: initial.revision,
        actors: [],
        useCases: [{ title: "New", description, actorNames: ["Operator"] }],
      }),
      { status: 422 },
    );
  }
  assert.equal((await state.read()).revision, initial.revision);
  const fiveSentences =
    "Operator starts e.g. a review. They select an item. They review it. They confirm. They see the outcome.";
  const added = await state.addFindings({
    revision: initial.revision,
    actors: [],
    useCases: [
      { title: "New", description: fiveSentences, actorNames: ["Operator"] },
    ],
  });
  assert.equal(added.state.useCases[0].description, sixSentences);
  assert.equal(added.state.useCases[1].description, fiveSentences);
  const edited = await state.save({
    revision: added.revision,
    state: {
      ...added.state,
      useCases: [
        added.state.useCases[0],
        { ...added.state.useCases[1], description: sixSentences },
      ],
    },
  });
  assert.equal(edited.state.useCases[1].description, sixSentences);
});

test("sync can add use cases when no actors exist", async (t) => {
  const state = createActorState(join(await workspace(t), "state.json"));
  const result = await state.addFindings({
    revision: null,
    actors: [],
    useCases: [{ title: "Explore", description: "Explore the project." }],
  });
  assert.deepEqual(result.state.actors, []);
  assert.deepEqual(result.state.useCases, [
    {
      id: result.state.useCases[0].id,
      title: "Explore",
      description: "Explore the project.",
      accepted: false,
    },
  ]);
  assert.match(result.state.useCases[0].id, /^[0-9a-f-]{36}$/);
});

test("sync preserves legacy entities but rejects entity additions", async (t) => {
  const store = createActorState(join(await workspace(t), "state.json"));
  const saved = await store.save({
    revision: null,
    state: {
      schemaVersion: 1,
      actors: [],
      useCases: [
        { title: "Review", description: "Review a project.", accepted: false },
      ],
      entities: [{ name: "Existing", description: "", accepted: true }],
      archivedUseCases: [{ title: "Old", description: "", accepted: true }],
      archivedEntities: [
        { name: "Record", description: "", aliases: ["Entry"] },
      ],
    },
  });
  const additions = {
    actors: [],
    useCases: [],
    entities: [{ name: "Project", description: "Reviewed by an operator." }],
  };
  await assert.rejects(
    store.addFindings({ revision: saved.revision, ...additions }),
    { status: 422 },
  );
  const added = await store.addFindings({
    revision: saved.revision,
    actors: [{ name: "Operator", description: "" }],
    useCases: [],
  });
  assert.deepEqual(added.state.entities, saved.state.entities);
  assert.deepEqual(added.state.archivedEntities, saved.state.archivedEntities);
  await assert.rejects(
    store.addFindings({ revision: saved.revision, actors: [], useCases: [] }),
    { status: 409 },
  );
  await assert.rejects(
    store.save({
      revision: added.revision,
      state: { ...added.state, entities: [{ name: "", description: "" }] },
    }),
    { status: 422 },
  );
});

test("legacy entities are read as confirmed and normalized on save", async (t) => {
  const statePath = join(await workspace(t), "state.json");
  const legacy = {
    schemaVersion: 1,
    actors: [],
    entities: [{ name: "Project", description: "Existing", accepted: false }],
    archivedEntities: [{ name: "Old", description: "", accepted: false }],
  };
  await writeFile(statePath, JSON.stringify(legacy));
  const store = createActorState(statePath);
  const loaded = await store.read();
  assert.equal(loaded.state.entities[0].accepted, true);
  assert.equal(loaded.state.archivedEntities[0].accepted, true);
  assert.deepEqual(JSON.parse(await readFile(statePath, "utf8")), legacy);
  const saved = await store.save({ revision: loaded.revision, state: legacy });
  assert.equal(saved.state.entities[0].accepted, true);
  assert.equal(
    JSON.parse(await readFile(statePath, "utf8")).entities[0].accepted,
    true,
  );
});

test("archive and aliases survive saves and block rediscovery", async (t) => {
  const store = createActorState(join(await workspace(t), "state.json"));
  const saved = await store.save({
    revision: null,
    state: {
      schemaVersion: 1,
      actors: [
        {
          id: "actor-1",
          name: "Maintainer",
          description: "Edited",
          aliases: ["Developer"],
          accepted: false,
        },
      ],
      useCases: [],
      archivedActors: [
        {
          id: "actor-2",
          name: "Visitor",
          description: "Removed",
          aliases: ["Reader"],
          accepted: false,
        },
      ],
      archivedUseCases: [
        {
          id: "case-1",
          title: "Deploy",
          description: "Removed",
          aliases: ["Ship"],
          accepted: false,
        },
      ],
    },
  });
  assert.deepEqual((await store.read()).state, saved.state);
  for (const [actors, useCases] of [
    [[{ name: "developer", description: "" }], []],
    [[{ name: " READER ", description: "" }], []],
    [[], [{ title: "deploy", description: "" }]],
    [[], [{ title: "SHIP", description: "" }]],
  ]) {
    await assert.rejects(
      store.addFindings({ revision: saved.revision, actors, useCases }),
      { status: 422 },
    );
  }
  const added = await store.addFindings({
    revision: saved.revision,
    actors: [{ name: "Administrator", description: "New" }],
    useCases: [],
  });
  assert.deepEqual(added.state.actors[0], saved.state.actors[0]);
  assert.deepEqual(added.state.archivedActors, saved.state.archivedActors);
  await assert.rejects(
    store.addFindings({ revision: saved.revision, actors: [], useCases: [] }),
    { status: 409 },
  );
  const restored = await store.save({
    revision: added.revision,
    state: {
      ...added.state,
      actors: [...added.state.actors, added.state.archivedActors[0]],
      archivedActors: [],
    },
  });
  assert.equal(restored.state.actors.at(-1).id, "actor-2");
  assert.deepEqual(restored.state.actors.at(-1).aliases, ["Reader"]);
});

test("sync endpoint accepts a stale view and submits against fresh saved state", async (t) => {
  const state = createActorState(join(await workspace(t), "state.json"));
  let sent = 0;
  let observed;
  const server = await startServer(state, "pagopa/dx", async () => {
    sent++;
    observed = await state.read();
    return "message-1";
  });
  t.after(() => server.close());
  const origin = new URL(server.url).origin;
  const post = (revision, requestOrigin = origin) =>
    fetch(`${server.url}sync-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Canvas-Request": "1",
        Origin: requestOrigin,
      },
      body: JSON.stringify({ revision }),
    });
  assert.equal((await post(null, "https://example.com")).status, 403);
  const saved = await state.save({
    revision: null,
    state: {
      schemaVersion: 1,
      actors: [{ name: "Latest", description: "" }],
      useCases: [],
    },
  });
  const response = await post(null);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { messageId: "message-1" });
  assert.equal(sent, 1);
  assert.equal(observed.revision, saved.revision);
  assert.equal(observed.state.actors[0].name, "Latest");
});

test("use-case discovery endpoint dispatches separately and rejects cross-origin requests", async (t) => {
  const state = createActorState(join(await workspace(t), "state.json"));
  let syncCalls = 0;
  let discoveryCalls = 0;
  const server = await startServer(
    state,
    "pagopa/dx",
    async () => {
      syncCalls++;
      return "sync";
    },
    async () => {
      discoveryCalls++;
      return "discovery";
    },
  );
  t.after(() => server.close());
  const post = (origin, body = { revision: null }) =>
    fetch(`${server.url}find-use-cases`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Canvas-Request": "1",
        Origin: origin,
      },
      body: JSON.stringify(body),
    });
  const origin = new URL(server.url).origin;
  assert.equal((await post("https://example.com")).status, 403);
  assert.equal((await post(origin, {})).status, 400);
  const result = await post(origin);
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { messageId: "discovery" });
  assert.equal(discoveryCalls, 1);
  assert.equal(syncCalls, 0);
});

test("finding saves reject truncated revisions and preserve concurrent edits", async (t) => {
  const store = createActorState(join(await workspace(t), "state.json"));
  const initial = await store.save({
    revision: null,
    state: { schemaVersion: 1, actors: [], useCases: [] },
  });
  await assert.rejects(
    store.addFindings({
      revision: initial.revision.slice(0, -1),
      actors: [],
      useCases: [],
    }),
    { status: 400 },
  );
  const concurrent = await store.save({
    revision: initial.revision,
    state: {
      ...initial.state,
      actors: [{ name: "New actor", description: "User edit" }],
    },
  });
  await assert.rejects(
    store.addFindings({
      revision: initial.revision,
      actors: [{ name: "Other actor", description: "Discovered" }],
      useCases: [],
    }),
    { status: 409 },
  );
  const fresh = await store.read();
  assert.equal(fresh.revision, concurrent.revision);
  const merged = await store.addFindings({
    revision: fresh.revision,
    actors: [{ name: "Other actor", description: "Discovered" }],
    useCases: [],
  });
  assert.deepEqual(
    merged.state.actors.map(({ name }) => name),
    ["New actor", "Other actor"],
  );
  assert.equal(merged.state.actors[0].description, "User edit");
});

test("sync classifies existing actors without overwriting roles or confirmation", async (t) => {
  const store = createActorState(join(await workspace(t), "state.json"));
  const saved = await store.save({
    revision: null,
    state: {
      schemaVersion: 1,
      actors: [
        { name: "Operator", description: "Uses the service", accepted: true },
        {
          name: "Cloud",
          description: "Supplies information",
          role: "Supporting",
          accepted: true,
        },
      ],
      archivedActors: [{ name: "Old actor", description: "", accepted: false }],
      useCases: [],
    },
  });
  const result = await store.addFindings({
    revision: saved.revision,
    actors: [{ name: "Reviewer", description: "Reviews", role: "Primary" }],
    actorRoleUpdates: [{ actorName: "Operator", role: "Primary" }],
    useCases: [
      {
        title: "Assess",
        description: "Operator requests an assessment.",
        actorNames: ["Operator"],
      },
    ],
  });
  assert.equal(result.state.actors[0].role, "Primary");
  assert.equal(result.state.actors[0].accepted, true);
  assert.equal(
    result.state.useCases[0].actorMentions[0].actorId,
    result.state.actors[0].id,
  );
  assert.equal(result.state.actors[2].role, "Primary");
  assert.equal(result.state.actors[2].accepted, false);
  assert.deepEqual(result.state.archivedActors, saved.state.archivedActors);
  for (const actorRoleUpdates of [
    [{ actorName: "Cloud", role: "Primary" }],
    [{ actorName: "Old actor", role: "Primary" }],
    [{ actorName: "Reviewer", role: "Unknown" }],
  ]) {
    await assert.rejects(
      store.addFindings({
        revision: result.revision,
        actors: [],
        useCases: [],
        actorRoleUpdates,
      }),
      { status: 422 },
    );
  }
  await assert.rejects(
    store.addFindings({
      revision: saved.revision,
      actors: [],
      useCases: [],
      actorRoleUpdates: [{ actorName: "Operator", role: "Primary" }],
    }),
    { status: 409 },
  );
  await assert.rejects(
    store.save({
      revision: result.revision,
      state: {
        ...result.state,
        archivedActors: [{ name: "Old", description: "", role: "Unknown" }],
      },
    }),
    { status: 422 },
  );
  assert.equal((await store.read()).revision, result.revision);
});

test("sync records pinned sources on findings without altering existing content", async (t) => {
  const store = createActorState(join(await workspace(t), "state.json"));
  const sha = "a".repeat(40);
  const sha2 = "b".repeat(40);
  const source = { fullName: "pagopa/dx", sha };
  const saved = await store.save({
    revision: null,
    state: {
      schemaVersion: 1,
      repositories: [{ fullName: "pagopa/dx" }],
      actors: [
        { name: "Operator", description: "Uses the service", accepted: true },
      ],
      useCases: [
        { title: "Assess", description: "Operator assesses.", accepted: true },
      ],
      archivedActors: [{ name: "Archived", description: "", accepted: false }],
    },
  });
  const result = await store.addFindings({
    revision: saved.revision,
    actors: [
      { name: "Reviewer", description: "Reviews", sourceRevisions: [source] },
    ],
    useCases: [],
    sourceUpdates: [
      { kind: "actor", name: "Operator", sourceRevisions: [source] },
      { kind: "useCase", name: "Assess", sourceRevisions: [source] },
    ],
  });
  assert.deepEqual(result.state.actors[0].sourceRevisions, [source]);
  assert.equal(result.state.actors[0].accepted, true);
  assert.deepEqual(result.state.actors[1].sourceRevisions, [source]);
  assert.deepEqual(result.state.useCases[0].sourceRevisions, [source]);
  const revised = await store.addFindings({
    revision: result.revision,
    actors: [],
    useCases: [],
    sourceUpdates: [
      {
        kind: "actor",
        name: "Operator",
        sourceRevisions: [source, { ...source, sha: sha2 }],
      },
    ],
  });
  assert.deepEqual(revised.state.actors[0].sourceRevisions, [
    source,
    { ...source, sha: sha2 },
  ]);
  for (const sourceUpdates of [
    [{ kind: "actor", name: "Archived", sourceRevisions: [source] }],
    [
      {
        kind: "actor",
        name: "Operator",
        sourceRevisions: [{ fullName: "other/repo", sha }],
      },
    ],
    [
      {
        kind: "actor",
        name: "Operator",
        sourceRevisions: [{ ...source, sha: "latest" }],
      },
    ],
  ]) {
    await assert.rejects(
      store.addFindings({
        revision: revised.revision,
        actors: [],
        useCases: [],
        sourceUpdates,
      }),
      { status: 422 },
    );
  }
  await assert.rejects(
    store.addFindings({
      revision: result.revision,
      actors: [],
      useCases: [],
      sourceUpdates: [
        { kind: "actor", name: "Operator", sourceRevisions: [source] },
      ],
    }),
    { status: 409 },
  );
  assert.equal((await store.read()).revision, revised.revision);
});

test("generates a deterministic document from confirmed active findings", async (t) => {
  const directory = await workspace(t);
  const state = createActorState(join(directory, "state.json"));
  const saved = await state.save({
    revision: null,
    state: {
      schemaVersion: 1,
      repositories: [{ fullName: "pagopa/dx" }, { fullName: "other/repo" }],
      actors: [
        {
          name: "Operator",
          description: "Reviews findings.",
          role: "Primary",
          accepted: true,
          sourceRevisions: [{ fullName: "pagopa/dx", sha: "a".repeat(40) }],
        },
        {
          name: "Provider #1",
          description: "Supplies <data>.\nNext line.",
          accepted: true,
        },
        {
          name: "Unconfirmed actor",
          description: "Omitted",
          accepted: false,
          sourceRevisions: [{ fullName: "other/repo", sha: "b".repeat(40) }],
        },
      ],
      useCases: [
        {
          title: "Assess costs",
          description: "Operator reviews costs.",
          accepted: true,
        },
        { title: "Unconfirmed case", description: "Omitted", accepted: false },
      ],
      archivedActors: [
        { name: "Archived actor", description: "Omitted", accepted: true },
      ],
      archivedUseCases: [
        { title: "Archived case", description: "Omitted", accepted: true },
      ],
    },
  });
  const documentPath = join(directory, "brownfield.md");
  await writeFile(documentPath, "User content to replace");
  assert.deepEqual(await state.generateDocument({ revision: saved.revision }), {
    path: documentPath,
  });
  const content = await readFile(documentPath, "utf8");
  assert.equal(
    content,
    [
      "# Brownfield documentation",
      "",
      "The actors and use cases below were inferred from source code and reviewed; they are not proposals. They may have been edited during review.",
      "",
      "## Source repositories",
      "",
      "Recorded commits are the revisions inspected for confirmed findings. Configured repositories are also listed when no commit has been recorded.",
      "",
      `- pagopa/dx: \`${"a".repeat(40)}\``,
      "",
      "- other/repo: commit not recorded",
      "",
      "Some confirmed findings have no recorded source commit.",
      "",
      "## Actors",
      "",
      "### Operator",
      "",
      "**Role:** Primary",
      "",
      "Reviews findings.",
      "",
      "### Provider \\#1",
      "",
      "**Role:** Unspecified",
      "",
      "Supplies &lt;data&gt;.<br>",
      "Next line.",
      "",
      "## Use cases",
      "",
      "### Assess costs",
      "",
      "Operator reviews costs.",
      "",
    ].join("\n"),
  );
  await state.generateDocument({ revision: saved.revision });
  assert.equal(await readFile(documentPath, "utf8"), content);
  await writeFile(join(directory, "state.json.lock"), "");
  await assert.rejects(state.generateDocument({ revision: saved.revision }), {
    status: 409,
  });
  assert.equal(await readFile(documentPath, "utf8"), content);
  await rm(join(directory, "state.json.lock"));
  const updated = await state.save({
    revision: saved.revision,
    state: { ...saved.state, actors: [] },
  });
  await assert.rejects(state.generateDocument({ revision: saved.revision }), {
    status: 409,
  });
  assert.equal(await readFile(documentPath, "utf8"), content);
  await state.generateDocument({ revision: updated.revision });
  assert.doesNotMatch(await readFile(documentPath, "utf8"), /Provider/);
});

test("document generation enforces origin and revision without touching state", async (t) => {
  const directory = await workspace(t);
  const store = createActorState(join(directory, "state.json"));
  const initial = await store.read();
  const server = await startServer(store);
  t.after(() => server.close());
  const origin = new URL(server.url).origin;
  const post = (revision, requestOrigin = origin) =>
    fetch(`${server.url}generate-document`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Canvas-Request": "1",
        Origin: requestOrigin,
      },
      body: JSON.stringify({ revision }),
    });
  assert.equal((await post(null, "https://example.com")).status, 403);
  assert.equal((await post("stale")).status, 409);
  assert.equal((await post(initial.revision)).status, 200);
  assert.deepEqual(await store.read(), initial);
  assert.equal(
    await readFile(join(directory, "brownfield.md"), "utf8"),
    "# Brownfield documentation\n\nThe actors and use cases below were inferred from source code and reviewed; they are not proposals. They may have been edited during review.\n\n## Source repositories\n\nRecorded commits are the revisions inspected for confirmed findings. Configured repositories are also listed when no commit has been recorded.\n\nNo repositories or source commits recorded.\n\n## Actors\n\n## Use cases\n",
  );
});

test("sync action exposes role and rename updates alongside additions", async () => {
  const source = await readFile(
    new URL("./extension.mjs", import.meta.url),
    "utf8",
  );
  const action = source.slice(
    source.indexOf('description: "Append findings, classify'),
  );
  const start = action.indexOf("inputSchema: ") + "inputSchema: ".length;
  const end = action.indexOf("\n          handler:", start);
  const schema = runInNewContext(
    `(${action.slice(start, end).trim().replace(/,$/, "")})`,
  );
  assert.equal(schema.properties.useCaseUpdates.type, "array");
  assert.equal(schema.properties.useCases.useCaseUpdates, undefined);
  assert.equal(
    schema.properties.useCaseUpdates.items.properties.renamedActorName.type,
    "string",
  );
  assert.deepEqual(
    Array.from(schema.properties.actorRoleUpdates.items.properties.role.enum),
    ["Primary", "Supporting"],
  );
  assert.deepEqual(
    Array.from(schema.properties.actors.items.properties.role.enum),
    ["Primary", "Supporting"],
  );
  assert.equal(schema.properties.sourceUpdates.type, "array");
  assert.equal(
    schema.properties.actors.items.properties.sourceRevisions.type,
    "array",
  );
  assert.equal(schema.properties.revision.pattern, "^[0-9a-f]{64}$");
});

test("sync prompt targets its canvas and protects existing findings", () => {
  const prompt = syncPrompt("brownfield-panel-1");
  assert.match(prompt, /brownfield-panel-1/);
  assert.match(prompt, /read_actors/);
  assert.match(prompt, /add_findings/);
  assert.match(
    prompt,
    /use only its configured GitHub repositories as sources/,
  );
  assert.match(prompt, /ignore any legacy documentation URLs/);
  assert.match(
    prompt,
    /If no repositories are configured, report that and skip repository investigation/,
  );
  assert.match(prompt, /Do not fetch external documentation URLs/);
  assert.match(prompt, /Preserve sources, unrelated state, and existing items/);
  assert.match(prompt, /reword every affected active use case/);
  assert.match(prompt, /Each changed use case becomes unconfirmed for review/);
  assert.match(prompt, /Leave unaffected and archived use cases unchanged/);
  assert.match(
    prompt,
    /additions, actor role updates, source updates, and rename-related use-case updates together/,
  );
  assert.match(prompt, /inspect its contents at that immutable commit/);
  assert.match(prompt, /Do not treat uncommitted working-tree content/);
  assert.match(prompt, /sourceRevisions/);
  assert.match(prompt, /sourceUpdates/);
  assert.match(prompt, /Immediately before saving, read_actors again/);
  assert.match(prompt, /do not blindly replay a stale payload/i);
  assert.match(
    prompt,
    /reconcile the findings and confirmed-actor goals with the fresh snapshot/,
  );
  assert.match(prompt, /every time sync runs, ask the user/i);
  assert.match(prompt, /one or more parts, or all source code/);
  assert.match(
    prompt,
    /If the user cancels or declines to choose, stop without saving/,
  );
  assert.match(prompt, /actorRoleUpdates/);
  assert.match(prompt, /Do not directly edit the state file/);
  assert.match(
    prompt,
    /active actors already confirmed in the state returned by read_actors \(accepted is true\)/,
  );
  assert.match(
    prompt,
    /Ignore archived and unconfirmed actors, including newly discovered actors/,
  );
  assert.match(
    prompt,
    /unconfirmed actors must not prevent use-case discovery for confirmed actors/,
  );
  assert.match(
    prompt,
    /If no active actors are confirmed, do not add use cases/,
  );
  assert.match(prompt, /one functional requirement/);
  assert.match(prompt, /actor's goal and functional flow/);
  assert.match(prompt, /no more than five sentences/);
  assert.match(prompt, /Do not include implementation details/);
  assert.match(prompt, /Do not invent missing steps or business rules/);
  assert.match(prompt, /system boundary/);
  assert.match(
    prompt,
    /primary actors who initiate a goal from supporting actors/,
  );
  assert.match(prompt, /elementary business process or user-goal level/);
  assert.match(prompt, /observable result of value/);
  assert.match(
    prompt,
    /group related create, retrieve, update, and delete operations/,
  );
  assert.match(prompt, /Start each title with a strong verb/);
  assert.match(
    prompt,
    /Do not make separate use cases for internal procedures/,
  );
  assert.match(
    prompt,
    /Group the main success path and evidence-backed alternatives or failures/,
  );
  assert.match(prompt, /Describe the system as a black box/);
  assert.match(
    prompt,
    /existing use cases that appear fragmented and could be consolidated/,
  );
  assert.match(
    prompt,
    /cross-cutting non-functional constraints and global business rules separately/,
  );
  assert.doesNotMatch(
    prompt,
    /infer entities|add entities|entities are automatically confirmed/,
  );
  assert.match(
    prompt,
    /Do not include source citations in actor or use-case names, titles, or descriptions/,
  );
  assert.match(
    prompt,
    /archivedActors and archivedUseCases as removed findings/,
  );
  assert.match(prompt, /Report possible semantic matches for review/);
});

test("use-case discovery shares sync rules but infers scope and preserves actors", () => {
  const prompt = findUseCasesPrompt("brownfield-panel-1");
  const sync = syncPrompt("brownfield-panel-1");
  for (const rule of [
    "Build an actor-goal list for active actors already confirmed",
    "Model each use case at the elementary business process or user-goal level",
    "Do not make separate use cases for internal procedures",
    "Use no more than five sentences",
    "Describe the system as a black box",
    "When a confirmed actor has been renamed, reword every affected active use case",
    "Each changed use case becomes unconfirmed for review",
  ]) {
    assert.ok(prompt.includes(rule), rule);
    assert.ok(sync.includes(rule), rule);
  }
  assert.match(prompt, /brownfield-panel-1/);
  assert.match(
    prompt,
    /Infer the relevant code scope from the confirmed actors' names and descriptions/,
  );
  assert.match(prompt, /Do not ask the user to choose a scope/);
  assert.match(
    prompt,
    /Do not discover, add, classify, or update actors or their provenance/,
  );
  assert.match(prompt, /passing actors: \[\]/);
  assert.match(prompt, /Do not submit actorRoleUpdates or actor sourceUpdates/);
  assert.match(prompt, /Immediately before saving, read_actors again/);
  assert.match(prompt, /inspect its contents at that immutable commit/);
  assert.match(prompt, /Retry up to three times/);
  assert.match(
    prompt,
    /archivedActors and archivedUseCases as removed findings/,
  );
  assert.match(
    prompt,
    /If no active actors are confirmed, report that actor confirmation is needed and stop/,
  );
});

test("sync endpoint reports dispatch failures", async (t) => {
  const state = createActorState(join(await workspace(t), "state.json"));
  const server = await startServer(state, "pagopa/dx", async () => {
    throw new Error("Session disconnected");
  });
  t.after(() => server.close());
  const response = await fetch(`${server.url}sync-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Canvas-Request": "1",
      Origin: new URL(server.url).origin,
    },
    body: JSON.stringify({ revision: null }),
  });
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /Session disconnected/);
});

test("actor saves reject stale revisions, overlapping stores, and invalid files without overwriting", async (t) => {
  const statePath = join(await workspace(t), "state.json");
  const first = createActorState(statePath);
  const second = createActorState(statePath);
  const initial = await first.read();
  const state = {
    actors: [{ description: "", name: "Operator" }],
    schemaVersion: 1,
  };
  const results = await Promise.allSettled([
    first.save({ revision: initial.revision, state }),
    second.save({ revision: initial.revision, state }),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    results.find((result) => result.status === "rejected").reason.status,
    409,
  );
  await assert.rejects(second.save({ revision: initial.revision, state }), {
    status: 409,
  });
  const loaded = await first.read();
  for (const invalid of [
    {
      actors: [],
      schemaVersion: 1,
      useCases: [{ description: "", title: " " }],
    },
    {
      actors: [],
      schemaVersion: 1,
      useCases: [{ description: 42, title: "Deploy" }],
    },
    { actors: [], schemaVersion: 1, useCases: null },
    { actors: [], schemaVersion: 2 },
    { actors: [{ description: "", name: " " }], schemaVersion: 1 },
    { actors: [{ description: 42, name: "Operator" }], schemaVersion: 1 },
    {
      actors: [{ accepted: "yes", description: "", name: "Operator" }],
      schemaVersion: 1,
    },
    {
      actors: [{ aliases: [42], description: "", name: "Operator" }],
      schemaVersion: 1,
    },
    { actors: [], archivedActors: null, schemaVersion: 1 },
    {
      actors: [],
      archivedUseCases: [{ title: "", description: "" }],
      schemaVersion: 1,
    },
    {
      actors: [{ id: "same", description: "", name: "Operator" }],
      archivedActors: [{ id: "same", description: "", name: "Reader" }],
      schemaVersion: 1,
    },
    {
      actors: [],
      schemaVersion: 1,
      useCases: [{ accepted: null, description: "", title: "Deploy" }],
    },
    { actors: [], repositories: null, schemaVersion: 1 },
    {
      actors: [],
      repositories: [{ fullName: "not-a-repository" }],
      schemaVersion: 1,
    },
    {
      actors: [],
      repositories: [{ fullName: "pagopa/dx" }, { fullName: "PAGOPA/DX" }],
      schemaVersion: 1,
    },
    {
      actors: [],
      repositories: Array.from({ length: 501 }, () => ({
        fullName: "pagopa/dx",
      })),
      schemaVersion: 1,
    },
  ]) {
    await assert.rejects(
      first.save({ revision: loaded.revision, state: invalid }),
      { status: 422 },
    );
    assert.deepEqual(await first.read(), loaded);
  }
  for (const content of ["{broken", '{"schemaVersion":2,"actors":[]}']) {
    await writeFile(statePath, content);
    await assert.rejects(first.read(), { status: 422 });
    await assert.rejects(first.save({ revision: loaded.revision, state }), {
      status: 422,
    });
    assert.equal(await readFile(statePath, "utf8"), content);
  }
});

test("actor API loads and saves, and rejects conflicts and cross-origin writes", async (t) => {
  const directory = await workspace(t);
  const actorState = createActorState(join(directory, "state.json"));
  const server = await startServer(actorState, "pagopa/dx");
  t.after(() => server.close());
  const loaded = await (await fetch(`${server.url}actors`)).json();
  assert.equal(loaded.currentRepository, "pagopa/dx");
  const input = {
    revision: loaded.revision,
    state: {
      actors: [{ description: "Evidence", name: "<script>not HTML</script>" }],
      schemaVersion: 1,
      sources: [{ url: "https://example.com/spec" }],
      useCases: [
        {
          description: "Full description\nwith details.",
          title: "Investigate",
        },
      ],
    },
  };
  const post = (origin) =>
    fetch(`${server.url}save-actors`, {
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        "X-Canvas-Request": "1",
      },
      method: "POST",
    });
  assert.equal((await post("https://example.com")).status, 403);
  const response = await post(new URL(server.url).origin);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).state, input.state);
  assert.equal((await post(new URL(server.url).origin)).status, 409);
  const reloaded = await (await fetch(`${server.url}actors`)).json();
  assert.deepEqual(reloaded.state, input.state);
  assert.equal((await fetch(`${server.url}actors.mjs`)).status, 200);
  const html = await (await fetch(server.url)).text();
  assert.match(html, /id="actor-rows"/);
  assert.match(html, /id="retry-save"/);
  assert.doesNotMatch(html, /id="reload-actors"/);
  assert.match(html, /id="use-case-rows"/);
  assert.doesNotMatch(html, /actors-section-status|use-cases-section-status/);
  assert.match(
    html,
    /<th scope="col">Title<\/th>\s*<th scope="col">Description<\/th>\s*<th scope="col">Actions<\/th>/,
  );
  assert.doesNotMatch(
    html,
    /id="source-rows"|id="add-source"|Documentation sources/,
  );
  assert.match(html, /id="repository-rows"/);
  assert.match(html, /Sync from source code/);
  assert.doesNotMatch(
    html,
    /id="update-documentation"|id="documentation-status"/,
  );
  assert.match(html, /id="sync-code" type="button" disabled/);
  assert.match(
    html,
    /aria-labelledby="actors-heading"[\s\S]*id="actor-rows"[\s\S]*id="find-use-cases"[^>]*>[\s\S]*Find use cases from confirmed actors[\s\S]*<\/section>/,
  );
  assert.match(
    html,
    /id="generate-document" type="button" disabled>[\s\S]*Generate brownfield document/,
  );
  assert.ok(
    html.indexOf('aria-label="Repository state controls"') <
      html.indexOf('id="findings-page"'),
    "save status and retry must remain visible on both pages",
  );
  assert.match(
    html,
    /aria-label="Repository state controls"[\s\S]*id="repositories-section"[\s\S]*id="repository-rows"[\s\S]*id="add-repository"[\s\S]*<\/section>\s*<div class="state-control-bar">[\s\S]*id="sync-code"[\s\S]*<\/section>\s*<nav class="page-navigation"[\s\S]*<\/nav>\s*<div id="findings-page">/,
  );
  assert.doesNotMatch(html, /id="sources-group-heading"|Sources and findings/);
  assert.match(html, /id="show-findings"[^>]*>Domain model<\/button>/);
  assert.match(html, /id="add-repository"[^>]*>[\s\S]*Add repository/);
  assert.match(html, /id="findings-heading">Domain model<\/h2>/);
  assert.match(html, /id="show-archive"[^>]*>Archive<\/button>/);
  assert.match(html, /id="archive-page"[^>]*hidden/);
  assert.match(html, /id="archived-actor-rows"/);
  assert.match(html, /id="archived-use-case-rows"/);
  assert.doesNotMatch(html, /id="entities-section"|id="entity-rows"/);
  assert.doesNotMatch(html, /archived-entities-heading|archived-entity-rows/);
  assert.doesNotMatch(html, /use-cases-lock-notice|data-locked/);
  assert.match(
    html,
    /aria-label="Repository state controls"[\s\S]*id="retry-save"[\s\S]*id="sync-code"[\s\S]*<\/section>[\s\S]*aria-labelledby="actors-heading"[\s\S]*id="actor-rows"[\s\S]*<\/section>[\s\S]*aria-labelledby="use-cases-heading"[\s\S]*id="use-case-rows"[\s\S]*<\/section>[\s\S]*<footer[\s\S]*State file location[\s\S]*id="actor-path"[\s\S]*<\/footer>/,
  );
  assert.doesNotMatch(html, /id="add-actor"/);
  assert.doesNotMatch(html, /id="add-use-case"/);
  assert.doesNotMatch(html, /id="confirm-all-actors"|Confirm all/);
  assert.doesNotMatch(html, /id="continue-actors"|id="continue-status"/);
  assert.doesNotMatch(html, /id="prompt"|id="start"|client\.mjs|class="steps"/);
});
test("canvas serves only the actor table and validates save requests", async (t) => {
  const server = await startServer(
    createActorState(join(await workspace(t), "state.json")),
  );
  t.after(() => server.close());
  const origin = new URL(server.url).origin;
  const headers = {
    "Content-Type": "application/json",
    Origin: origin,
    "X-Canvas-Request": "1",
  };
  const post = (path, body, requestHeaders = headers) =>
    fetch(`${server.url}${path}`, {
      body,
      headers: requestHeaders,
      method: "POST",
    });
  const html = await fetch(server.url);
  assert.match(await html.text(), /id="actor-rows"/);
  for (const asset of ["style.css", "actors.mjs", "github-repository.mjs"]) {
    assert.equal((await fetch(`${server.url}${asset}`)).status, 200);
  }
  for (const path of ["state", "client.mjs", "source-url.mjs"]) {
    assert.equal((await fetch(`${server.url}${path}`)).status, 404);
  }
  for (const path of ["start", "save"]) {
    assert.equal((await post(path, '{"prompt":"Removed"}')).status, 404);
  }
  assert.equal((await fetch(`${origin}/state`)).status, 404);
  assert.equal(
    (
      await post("save-actors", "{}", {
        ...headers,
        Origin: "https://example.com",
      })
    ).status,
    403,
  );
  const withoutMarker = { "Content-Type": "application/json", Origin: origin };
  assert.equal((await post("save-actors", "{}", withoutMarker)).status, 403);
  assert.equal((await post("save-actors", "{")).status, 400);
  assert.equal(
    (
      await post("save-actors", "{}", {
        ...headers,
        "Content-Type": "text/plain",
      })
    ).status,
    415,
  );
});
