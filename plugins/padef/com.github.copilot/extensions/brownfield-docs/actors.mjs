// Renders actors and use cases from one repository state snapshot.
import {
  initialGitHubRepositories,
  isValidGitHubRepository,
  isValidGitHubRepositories,
} from "./github-repository.mjs";
import {
  actorIsReferenced,
  availableActorRanges,
  labelRanges,
  linkMatchingActors,
  mentionRanges,
} from "./actor-mentions.mjs";

const rows = document.querySelector("#actor-rows");
const status = document.querySelector("#actor-status");
const retry = document.querySelector("#retry-save");
const sync = document.querySelector("#sync-code");
const syncStatus = document.querySelector("#sync-status");
const findUseCases = document.querySelector("#find-use-cases");
const findUseCasesHint = document.querySelector("#find-use-cases-hint");
const findUseCasesStatus = document.querySelector("#find-use-cases-status");
const generateDocument = document.querySelector("#generate-document");
const documentStatus = document.querySelector("#document-status");
const path = document.querySelector("#actor-path");
const useCaseRows = document.querySelector("#use-case-rows");
const archivedActorRows = document.querySelector("#archived-actor-rows");
const archivedUseCaseRows = document.querySelector("#archived-use-case-rows");
const findingsPage = document.querySelector("#findings-page");
const archivePage = document.querySelector("#archive-page");
const showFindings = document.querySelector("#show-findings");
const showArchive = document.querySelector("#show-archive");
const repositoryRows = document.querySelector("#repository-rows");
const addRepository = document.querySelector("#add-repository");
let actorChecks = [];
let useCaseChecks = [];
let repositoryChecks = [];
let snapshot;
let dirty = false;
let busy = false;
let saving = false;
let submittingSync = false;
let saveBlocked = false;
let changeVersion = 0;
let saveTimer;
let editingRow;
let editingButton;
const savedNames = new WeakMap();

function finishEditing() {
  if (!editingRow) return;
  editingRow.dataset.editing = "false";
  editingButton.textContent = "Edit";
  editingButton.setAttribute("aria-label", editingButton.dataset.editLabel);
  editingRow = undefined;
  editingButton = undefined;
}

function startEditing(row, button, input) {
  if (editingRow === row) {
    finishEditing();
    return;
  }
  finishEditing();
  editingRow = row;
  editingButton = button;
  row.dataset.editing = "true";
  button.textContent = "Done";
  button.setAttribute("aria-label", button.dataset.doneLabel);
  input.focus();
}

for (const event of ["pointerdown", "focusin"]) {
  document.addEventListener(event, (event) => {
    if (editingRow && !editingRow.contains(event.target)) finishEditing();
  });
}

function changed() {
  dirty = true;
  changeVersion++;
  if (!saveBlocked) scheduleSave();
  controls();
}

function scheduleSave() {
  clearTimeout(saveTimer);
  if (saving) {
    status.textContent = "Saving changes...";
    return;
  }
  if (
    snapshot.state.actors.some((actor) => !actor.name.trim()) ||
    snapshot.state.useCases?.some((useCase) => !useCase.title.trim())
  ) {
    status.textContent =
      "Enter a name for each actor and a title for each use case to save.";
    return;
  }
  if (!isValidGitHubRepositories(snapshot.state.repositories)) {
    status.textContent =
      "Enter a unique GitHub repository in owner/repository format for each source to save.";
    return;
  }
  status.textContent = "Changes waiting to save...";
  saveTimer = setTimeout(() => void saveChanges(), 400);
}

async function saveChanges() {
  if (!dirty || saving || busy || saveBlocked) return;
  saving = true;
  const version = changeVersion;
  const savedFindings = [
    ...snapshot.state.actors.map((item) => [item, "name", item.name]),
    ...(snapshot.state.useCases ?? []).map((item) => [
      item,
      "title",
      item.title,
    ]),
    ...(snapshot.state.archivedActors ?? []).map((item) => [
      item,
      "name",
      item.name,
    ]),
    ...(snapshot.state.archivedUseCases ?? []).map((item) => [
      item,
      "title",
      item.title,
    ]),
  ];
  controls();
  status.textContent = "Saving changes...";
  try {
    const saved = await request("save-actors", {
      revision: snapshot.revision,
      state: snapshot.state,
    });
    snapshot.revision = saved.revision;
    for (const [item, field, name] of savedFindings) {
      savedNames.set(item, name);
      rememberAlias(item, name, item[field]);
    }
    if (version === changeVersion) {
      dirty = false;
      status.textContent = "State saved to the repository file.";
    }
  } catch (error) {
    saveBlocked = true;
    status.textContent = `${error.message} Your unsaved edits are still in the table.`;
  } finally {
    saving = false;
    if (dirty && !saveBlocked) scheduleSave();
    controls();
  }
}

function controls() {
  addRepository.disabled =
    busy || !snapshot || snapshot.state.repositories.length >= 500;
  retry.hidden = !saveBlocked;
  retry.disabled = busy || saving;
  sync.disabled =
    !snapshot || busy || saving || dirty || saveBlocked || submittingSync;
  const hasConfirmedActors =
    snapshot?.state.actors.some((actor) => actor.accepted === true) ?? false;
  findUseCases.disabled = sync.disabled || !hasConfirmedActors;
  findUseCasesHint.hidden = !snapshot || hasConfirmedActors;
  generateDocument.disabled = sync.disabled;
  rows
    .querySelectorAll("input, textarea, select, button")
    .forEach((control) => {
      control.disabled = busy;
    });
  useCaseRows
    .querySelectorAll("input, textarea, select, button")
    .forEach((control) => {
      control.disabled = busy;
    });
  for (const archiveRows of [archivedActorRows, archivedUseCaseRows]) {
    archiveRows.querySelectorAll("button").forEach((control) => {
      control.disabled = busy;
    });
  }
  repositoryRows.querySelectorAll("input, button").forEach((control) => {
    control.disabled = busy;
  });
  actorChecks.forEach(({ actor, button, edit, remove, editors }) => {
    const referenced =
      actor.accepted && actorIsReferenced(snapshot.state, actor.id);
    button.disabled = busy || !actor.name.trim() || referenced;
    button.title = referenced
      ? "Unlink this actor from active and archived use cases before undoing confirmation."
      : "";
    button.setAttribute(
      "aria-label",
      referenced
        ? `${actor.name} is referenced. Unlink it from active and archived use cases before undoing confirmation.`
        : `${actor.accepted ? "Undo confirmation of" : "Confirm"} actor ${actor.name}`,
    );
    edit.disabled = busy || actor.accepted;
    remove.disabled =
      busy ||
      actor.accepted ||
      !actor.name.trim() ||
      (snapshot.state.archivedActors?.length ?? 0) >= 5000;
    remove.title =
      (snapshot.state.archivedActors?.length ?? 0) >= 5000
        ? "The actor archive has reached its limit."
        : "";
    editors.forEach((editor) => {
      editor.disabled = busy || actor.accepted;
    });
  });
  useCaseChecks.forEach(({ useCase, button, edit, remove, editors }) => {
    button.disabled = busy || !useCase.title.trim();
    edit.disabled = busy || useCase.accepted;
    remove.disabled =
      busy ||
      useCase.accepted ||
      !useCase.title.trim() ||
      (snapshot.state.archivedUseCases?.length ?? 0) >= 5000;
    remove.title =
      (snapshot.state.archivedUseCases?.length ?? 0) >= 5000
        ? "The use case archive has reached its limit."
        : "";
    editors.forEach((editor) => {
      editor.disabled = busy || useCase.accepted;
    });
  });
}

async function load() {
  clearTimeout(saveTimer);
  busy = true;
  controls();
  try {
    snapshot = await request("actors");
    snapshot.state.repositories = initialGitHubRepositories(
      snapshot.state.repositories,
    );
    for (const actor of snapshot.state.actors) actor.accepted ??= false;
    for (const useCase of snapshot.state.useCases ?? [])
      useCase.accepted ??= false;
    const linkedLegacy = linkMatchingActors(
      snapshot.state,
      [
        ...(snapshot.state.useCases ?? []),
        ...(snapshot.state.archivedUseCases ?? []),
      ],
      () => crypto.randomUUID(),
    );
    dirty = false;
    saveBlocked = false;
    path.textContent = snapshot.path;
    render();
    renderRepositories();
    status.textContent = "Repository state loaded.";
    if (linkedLegacy) changed();
  } catch (error) {
    status.textContent = `Could not load state: ${error.message}`;
    if (dirty) saveBlocked = true;
  } finally {
    busy = false;
    controls();
  }
}

async function refreshSavedState() {
  if (!snapshot || dirty || saving || busy || editingRow) return;
  const revision = snapshot.revision;
  try {
    const updated = await request("actors");
    if (
      dirty ||
      saving ||
      busy ||
      editingRow ||
      snapshot.revision !== revision ||
      updated.revision === revision
    )
      return;
    snapshot = updated;
    snapshot.state.repositories = initialGitHubRepositories(
      snapshot.state.repositories,
    );
    for (const actor of snapshot.state.actors) actor.accepted ??= false;
    for (const useCase of snapshot.state.useCases ?? [])
      useCase.accepted ??= false;
    const linkedLegacy = linkMatchingActors(
      snapshot.state,
      [
        ...(snapshot.state.useCases ?? []),
        ...(snapshot.state.archivedUseCases ?? []),
      ],
      () => crypto.randomUUID(),
    );
    path.textContent = snapshot.path;
    render();
    renderRepositories();
    status.textContent = "Repository state updated.";
    if (linkedLegacy) changed();
    controls();
  } catch (error) {
    status.textContent = `Could not check for state updates: ${error.message}`;
  }
}

function renderRepositories() {
  if (editingRow && repositoryRows.contains(editingRow)) finishEditing();
  repositoryRows.replaceChildren();
  repositoryChecks = [];
  snapshot.state.repositories.forEach((repository, index) => {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    const value = document.createElement("span");
    value.className = "row-value";
    value.textContent = repository.fullName || "Untitled repository";
    const input = document.createElement("input");
    input.className = "row-editor";
    input.type = "text";
    input.maxLength = 140;
    input.value = repository.fullName;
    input.placeholder = "owner/repository";
    input.setAttribute("aria-label", `GitHub repository ${index + 1}`);
    input.setAttribute("aria-describedby", `repository-error-${index}`);
    const error = document.createElement("span");
    error.id = `repository-error-${index}`;
    error.className = "source-error";
    const validate = () => {
      const validFormat = isValidGitHubRepository(repository.fullName);
      const duplicate =
        validFormat &&
        snapshot.state.repositories.some(
          (other) =>
            other !== repository &&
            other.fullName.toLowerCase() === repository.fullName.toLowerCase(),
        );
      input.setAttribute("aria-invalid", String(!validFormat || duplicate));
      error.textContent = !validFormat
        ? "Enter a GitHub repository as owner/repository."
        : duplicate
          ? "This repository is listed more than once."
          : "";
    };
    repositoryChecks.push(validate);
    input.addEventListener("input", () => {
      repository.fullName = input.value.trim();
      value.textContent = repository.fullName || "Untitled repository";
      repositoryChecks.forEach((check) => check());
      changed();
    });
    cell.append(value);
    cell.append(input);
    cell.append(error);
    row.append(cell);

    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "row-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "secondary";
    edit.textContent = "Edit";
    edit.dataset.editLabel = `Edit GitHub repository ${index + 1}`;
    edit.dataset.doneLabel = `Finish editing GitHub repository ${index + 1}`;
    edit.setAttribute("aria-label", edit.dataset.editLabel);
    edit.addEventListener("click", () => startEditing(row, edit, input));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "secondary";
    remove.textContent = "Delete";
    remove.setAttribute("aria-label", `Delete GitHub repository ${index + 1}`);
    remove.addEventListener("click", () => {
      snapshot.state.repositories.splice(index, 1);
      renderRepositories();
      changed();
    });
    actions.append(edit);
    actions.append(remove);
    actionsCell.append(actions);
    row.append(actionsCell);
    repositoryRows.append(row);
  });
  repositoryChecks.forEach((check) => check());
  if (!snapshot.state.repositories.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 2;
    cell.textContent =
      "No GitHub repositories yet. Add one to include its code as a source.";
    row.append(cell);
    repositoryRows.append(row);
  }
}

function render() {
  finishEditing();
  actorChecks = renderNamedFindings(rows, "actors", "archivedActors", "actor");
  renderUseCases();
  renderArchive();
  controls();
}

function renderNamedFindings(container, activeKey, archiveKey, label) {
  container.replaceChildren();
  const checks = [];
  const findings = snapshot.state[activeKey] ?? [];
  findings.forEach((actor, index) => {
    const row = document.createElement("tr");
    row.setAttribute("tabindex", "-1");
    row.addEventListener("animationend", (event) => {
      if (
        event.target === row &&
        event.animationName === "actor-row-highlight"
      ) {
        delete row.dataset.highlighted;
      }
    });
    let originalName = actor.name;
    const accept = document.createElement("button");
    accept.type = "button";
    accept.className = "secondary acceptance-button";
    accept.setAttribute("aria-label", `Confirm ${label} ${index + 1}`);
    const updateAcceptance = () => {
      accept.textContent = actor.accepted ? "Confirmed" : "Confirm";
      accept.setAttribute("aria-pressed", String(actor.accepted));
      row.dataset.confirmed = String(actor.accepted);
    };
    updateAcceptance();
    accept.addEventListener("click", () => {
      if (actor.accepted && actorIsReferenced(snapshot.state, actor.id)) {
        status.textContent =
          "Unlink this actor from active and archived use cases before undoing confirmation.";
        return;
      }
      actor.accepted = !actor.accepted;
      if (actor.accepted && editingRow === row) finishEditing();
      updateAcceptance();
      if (
        actor.accepted &&
        linkMatchingActors(
          snapshot.state,
          [
            ...(snapshot.state.useCases ?? []),
            ...(snapshot.state.archivedUseCases ?? []),
          ],
          () => crypto.randomUUID(),
        )
      ) {
        renderUseCases();
        renderArchive();
      } else {
        useCaseChecks.forEach(({ refreshMentions }) => refreshMentions());
      }
      changed();
    });
    const editors = [];
    for (const field of ["name", "description"]) {
      const cell = document.createElement("td");
      const value = document.createElement("span");
      value.className = `row-value actor-${field}`;
      value.textContent =
        actor[field] || (field === "name" ? `Unnamed ${label}` : "—");
      const input = document.createElement(
        field === "name" ? "input" : "textarea",
      );
      input.className = "row-editor";
      editors.push(input);
      input.value = actor[field];
      input.maxLength = field === "name" ? 200 : 10000;
      input.setAttribute(
        "aria-label",
        `${label === "actor" ? "Actor" : "Entity"} ${index + 1} ${field}`,
      );
      input.addEventListener("input", () => {
        actor.id ??= crypto.randomUUID();
        if (field === "name")
          rememberAlias(
            actor,
            savedNames.get(actor) ?? originalName,
            input.value,
          );
        actor[field] = input.value;
        value.textContent =
          input.value || (field === "name" ? `Unnamed ${label}` : "—");
        actor.accepted = false;
        updateAcceptance();
        changed();
      });
      cell.append(value);
      cell.append(input);
      row.append(cell);
    }
    const roleValue = document.createElement("span");
    roleValue.className = "row-value actor-role";
    roleValue.textContent = `Role: ${actor.role ?? "Unspecified"}`;
    const roleEditor = document.createElement("select");
    roleEditor.className = "row-editor actor-role-editor";
    roleEditor.setAttribute("aria-label", `Actor ${index + 1} role`);
    for (const [value, text] of [
      ["", "Unspecified"],
      ["Primary", "Primary"],
      ["Supporting", "Supporting"],
    ]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      roleEditor.append(option);
    }
    roleEditor.value = actor.role ?? "";
    roleEditor.addEventListener("change", () => {
      if (roleEditor.value) actor.role = roleEditor.value;
      else delete actor.role;
      roleValue.textContent = `Role: ${actor.role ?? "Unspecified"}`;
      actor.accepted = false;
      updateAcceptance();
      changed();
    });
    editors.push(roleEditor);
    row.children[0].append(roleValue);
    row.children[0].append(roleEditor);
    const cell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "row-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "secondary";
    edit.textContent = "Edit";
    edit.dataset.editLabel = `Edit ${label} ${index + 1}`;
    edit.dataset.doneLabel = `Finish editing ${label} ${index + 1}`;
    edit.setAttribute("aria-label", edit.dataset.editLabel);
    edit.addEventListener("click", () => {
      if (editingRow !== row) originalName = actor.name;
      startEditing(row, edit, row.querySelector(".row-editor"));
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "secondary";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${label} ${index + 1}`);
    remove.addEventListener("click", () => {
      actor.id ??= crypto.randomUUID();
      snapshot.state[archiveKey] ??= [];
      snapshot.state[archiveKey].push(actor);
      findings.splice(index, 1);
      render();
      changed();
    });
    actions.append(edit);
    actions.append(remove);
    actions.append(accept);
    cell.append(actions);
    row.append(cell);
    container.append(row);
    checks.push({
      actor,
      row,
      button: accept,
      edit,
      remove,
      editors,
      updateAcceptance,
    });
  });
  if (!findings.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.textContent =
      "No actors yet. Sync from source code to identify actors.";
    row.append(cell);
    container.append(row);
  }
  return checks;
}

function renderUseCases() {
  if (editingRow && useCaseRows.contains(editingRow)) finishEditing();
  useCaseRows.replaceChildren();
  useCaseChecks = [];
  (snapshot.state.useCases ?? []).forEach((useCase, index) => {
    const row = document.createElement("tr");
    let originalTitle = useCase.title;
    const accept = document.createElement("button");
    accept.type = "button";
    accept.className = "secondary acceptance-button";
    accept.setAttribute("aria-label", `Confirm use case ${index + 1}`);
    const updateAcceptance = () => {
      accept.textContent = useCase.accepted ? "Confirmed" : "Confirm";
      accept.setAttribute("aria-pressed", String(useCase.accepted));
      row.dataset.confirmed = String(useCase.accepted);
    };
    updateAcceptance();
    accept.addEventListener("click", () => {
      useCase.accepted = !useCase.accepted;
      if (useCase.accepted && editingRow === row) finishEditing();
      updateAcceptance();
      changed();
    });
    const editors = [];
    let refreshMentions = () => {};
    for (const field of ["title", "description"]) {
      const cell = document.createElement("td");
      const value = document.createElement("span");
      value.className = `row-value actor-${field === "title" ? "name" : "description"}`;
      if (field === "description") renderMentionDescription(value, useCase);
      else value.textContent = useCase[field] || "Untitled use case";
      const input = document.createElement(
        field === "title" ? "input" : "textarea",
      );
      input.className = "row-editor";
      editors.push(input);
      input.value = useCase[field];
      input.maxLength = field === "title" ? 200 : 10000;
      input.setAttribute("aria-label", `Use case ${index + 1} ${field}`);
      let renderMentionControls;
      input.addEventListener("input", () => {
        useCase.id ??= crypto.randomUUID();
        if (field === "title")
          rememberAlias(
            useCase,
            savedNames.get(useCase) ?? originalTitle,
            input.value,
          );
        useCase[field] = input.value;
        if (field === "description") {
          if (useCase.actorMentions) {
            useCase.actorMentions = useCase.actorMentions.filter(
              (mention) =>
                labelRanges(input.value, mention.label, { caseSensitive: true })
                  .length,
            );
          }
          renderMentionDescription(value, useCase);
          renderMentionControls();
        } else {
          value.textContent =
            input.value || (field === "title" ? "Untitled use case" : "—");
        }
        useCase.accepted = false;
        updateAcceptance();
        changed();
      });
      cell.append(value);
      cell.append(input);
      if (field === "description") {
        const mentionControls = document.createElement("div");
        mentionControls.className = "row-editor mention-controls";
        renderMentionControls = () => {
          mentionControls.replaceChildren();
          const linked = useCase.actorMentions ?? [];
          for (const actor of snapshot.state.actors.filter(
            (item) =>
              item.id && linked.some((mention) => mention.actorId === item.id),
          )) {
            const unlink = document.createElement("button");
            unlink.type = "button";
            unlink.className = "secondary";
            unlink.textContent = `Unlink ${actor.name}`;
            unlink.addEventListener("click", () => {
              useCase.actorMentions = linked.filter(
                (mention) => mention.actorId !== actor.id,
              );
              renderMentionDescription(value, useCase);
              renderMentionControls();
              changed();
            });
            mentionControls.append(unlink);
          }
          const candidates = snapshot.state.actors.filter(
            (actor) =>
              actor.accepted === true &&
              availableActorRanges(
                useCase.description,
                actor,
                linked,
                snapshot.state.actors,
              ).length &&
              !linked.some((mention) => mention.actorId === actor.id),
          );
          if (!candidates.length) return;
          const select = document.createElement("select");
          select.setAttribute(
            "aria-label",
            `Confirmed actor to link in use case ${index + 1}`,
          );
          const placeholder = document.createElement("option");
          placeholder.value = "";
          placeholder.textContent = "Choose a confirmed actor";
          select.append(placeholder);
          for (const actor of candidates) {
            const option = document.createElement("option");
            option.value = String(snapshot.state.actors.indexOf(actor));
            option.textContent =
              candidates.filter(
                (item) =>
                  item.name.trim().toLowerCase() ===
                  actor.name.trim().toLowerCase(),
              ).length > 1
                ? `${actor.name} (${snapshot.state.actors.indexOf(actor) + 1})`
                : actor.name;
            select.append(option);
          }
          const link = document.createElement("button");
          link.type = "button";
          link.className = "secondary";
          link.textContent = "Link actor";
          link.addEventListener("click", () => {
            if (select.value === "") {
              status.textContent = "Choose a confirmed actor to link.";
              return;
            }
            const actor = snapshot.state.actors[Number(select.value)];
            if (!actor || actor.accepted !== true) return;
            actor.id ??= crypto.randomUUID();
            useCase.actorMentions ??= [];
            for (const { label } of availableActorRanges(
              useCase.description,
              actor,
              useCase.actorMentions,
              snapshot.state.actors,
            )) {
              if (
                !useCase.actorMentions.some(
                  (mention) =>
                    mention.actorId === actor.id && mention.label === label,
                )
              ) {
                useCase.actorMentions.push({ actorId: actor.id, label });
              }
            }
            renderMentionDescription(value, useCase);
            renderMentionControls();
            changed();
          });
          mentionControls.append(select);
          mentionControls.append(link);
        };
        refreshMentions = () => {
          renderMentionDescription(value, useCase);
          renderMentionControls();
        };
        renderMentionControls();
        cell.append(mentionControls);
      }
      row.append(cell);
    }
    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "row-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "secondary";
    edit.textContent = "Edit";
    edit.dataset.editLabel = `Edit use case ${index + 1}`;
    edit.dataset.doneLabel = `Finish editing use case ${index + 1}`;
    edit.setAttribute("aria-label", edit.dataset.editLabel);
    edit.addEventListener("click", () => {
      if (editingRow !== row) originalTitle = useCase.title;
      startEditing(row, edit, row.querySelector(".row-editor"));
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "secondary";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove use case ${index + 1}`);
    remove.addEventListener("click", () => {
      useCase.id ??= crypto.randomUUID();
      snapshot.state.archivedUseCases ??= [];
      snapshot.state.archivedUseCases.push(useCase);
      snapshot.state.useCases.splice(index, 1);
      renderUseCases();
      renderArchive();
      changed();
    });
    actions.append(edit);
    actions.append(remove);
    actions.append(accept);
    actionsCell.append(actions);
    row.append(actionsCell);
    useCaseChecks.push({
      useCase,
      button: accept,
      edit,
      remove,
      editors,
      refreshMentions,
    });
    useCaseRows.append(row);
  });
  if (!snapshot.state.useCases?.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.textContent =
      "No use cases yet. Sync from source code to identify use cases.";
    row.append(cell);
    useCaseRows.append(row);
  }
}

function renderMentionDescription(container, useCase) {
  const description = useCase.description || "";
  const ranges = mentionRanges(
    description,
    useCase.actorMentions,
    snapshot.state.actors,
  );
  if (!ranges.length) {
    container.textContent = description || "—";
    return;
  }
  container.replaceChildren();
  let position = 0;
  for (const range of ranges) {
    const text = document.createElement("span");
    text.textContent = description.slice(position, range.start);
    container.append(text);
    const link = document.createElement("button");
    link.type = "button";
    link.className = "actor-mention";
    link.textContent = range.actor.name;
    link.setAttribute("aria-label", `Go to actor ${range.actor.name}`);
    link.addEventListener("click", () => {
      showPage(false);
      const target = actorChecks.find(
        (entry) => entry.actor === range.actor,
      )?.row;
      if (!target) return;
      target.scrollIntoView?.({ block: "center" });
      target.focus({ preventScroll: true });
      delete target.dataset.highlighted;
      void target.offsetWidth;
      target.dataset.highlighted = "true";
    });
    container.append(link);
    position = range.end;
  }
  const rest = document.createElement("span");
  rest.textContent = description.slice(position);
  container.append(rest);
}

function rememberAlias(item, original, current) {
  const normalized = original.trim().toLowerCase();
  if (!normalized || normalized === current.trim().toLowerCase()) return;
  item.aliases ??= [];
  if (
    !item.aliases.some((alias) => alias.trim().toLowerCase() === normalized)
  ) {
    item.aliases.push(original);
  }
}

function renderArchive() {
  for (const [container, archiveKey, activeKey, field, label] of [
    [archivedActorRows, "archivedActors", "actors", "name", "actor"],
    [archivedUseCaseRows, "archivedUseCases", "useCases", "title", "use case"],
  ]) {
    container.replaceChildren();
    const archived = snapshot.state[archiveKey] ?? [];
    archived.forEach((item, index) => {
      const row = document.createElement("tr");
      for (const [value, className] of [
        [item[field], "actor-name"],
        [item.description || "—", "actor-description"],
      ]) {
        const cell = document.createElement("td");
        const text = document.createElement("span");
        text.className = `row-value ${className}`;
        if (
          archiveKey === "archivedUseCases" &&
          className === "actor-description"
        ) {
          renderMentionDescription(text, item);
        } else {
          text.textContent = value;
        }
        cell.append(text);
        if (archiveKey === "archivedActors" && className === "actor-name") {
          const role = document.createElement("span");
          role.className = "row-value actor-role";
          role.textContent = `Role: ${item.role ?? "Unspecified"}`;
          cell.append(role);
        }
        row.append(cell);
      }
      const cell = document.createElement("td");
      const actions = document.createElement("div");
      actions.className = "row-actions";
      const restore = document.createElement("button");
      restore.type = "button";
      restore.className = "secondary";
      restore.textContent = "Restore";
      restore.setAttribute("aria-label", `Restore ${label} ${item[field]}`);
      restore.addEventListener("click", () => {
        const active = snapshot.state[activeKey] ?? [];
        if (active.length >= 500) {
          status.textContent = `Cannot restore: the ${label} list has reached its limit.`;
          return;
        }
        if (
          active.some(
            (existing) =>
              existing[field].trim().toLowerCase() ===
              item[field].trim().toLowerCase(),
          )
        ) {
          status.textContent = `Cannot restore: an active ${label} already has this ${field}.`;
          return;
        }
        archived.splice(index, 1);
        snapshot.state[activeKey] ??= [];
        snapshot.state[activeKey].push(item);
        render();
        changed();
      });
      actions.append(restore);
      cell.append(actions);
      row.append(cell);
      container.append(row);
    });
    if (!archived.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 3;
      cell.textContent = `No removed ${label === "actor" ? "actors" : "use cases"}.`;
      row.append(cell);
      container.append(row);
    }
  }
}

async function request(endpoint, input) {
  const response = await fetch(
    `./${endpoint}`,
    input === undefined
      ? {}
      : {
          body: JSON.stringify(input),
          headers: {
            "Content-Type": "application/json",
            "X-Canvas-Request": "1",
          },
          method: "POST",
        },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}

function showPage(archive) {
  finishEditing();
  findingsPage.hidden = archive;
  archivePage.hidden = !archive;
  showFindings.setAttribute("aria-pressed", String(!archive));
  showArchive.setAttribute("aria-pressed", String(archive));
}
showFindings.addEventListener("click", () => showPage(false));
showArchive.addEventListener("click", () => showPage(true));
addRepository.addEventListener("click", () => {
  snapshot.state.repositories.push({ fullName: "" });
  renderRepositories();
  changed();
  repositoryRows.lastElementChild.querySelector(".row-actions button").click();
});
retry.addEventListener("click", () => {
  saveBlocked = false;
  scheduleSave();
  controls();
});
async function submitInvestigation(endpoint, targetStatus, label) {
  targetStatus.hidden = false;
  submittingSync = true;
  controls();
  targetStatus.textContent = `Submitting ${label} request...`;
  try {
    await request(endpoint, { revision: snapshot.revision });
    targetStatus.textContent = `${label === "sync" ? "Sync" : "Use-case discovery"} request submitted. Follow its progress in the conversation.`;
  } catch (error) {
    targetStatus.textContent = `Could not submit ${label}: ${error.message}`;
  } finally {
    submittingSync = false;
    controls();
  }
}
sync.addEventListener("click", () =>
  submitInvestigation("sync-code", syncStatus, "sync"),
);
findUseCases.addEventListener("click", () =>
  submitInvestigation(
    "find-use-cases",
    findUseCasesStatus,
    "use-case discovery",
  ),
);
generateDocument.addEventListener("click", async () => {
  documentStatus.hidden = false;
  busy = true;
  controls();
  documentStatus.textContent = "Generating brownfield document...";
  try {
    const result = await request("generate-document", {
      revision: snapshot.revision,
    });
    documentStatus.textContent = `Generated ${result.path}.`;
  } catch (error) {
    documentStatus.textContent = `Could not generate document: ${error.message}`;
  } finally {
    busy = false;
    controls();
  }
});
window.addEventListener("beforeunload", (event) => {
  if (dirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});
void load();
setInterval(() => void refreshSavedState(), 3000);
