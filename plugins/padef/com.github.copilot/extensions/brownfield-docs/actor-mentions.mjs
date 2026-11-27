// Links and locates confirmed actors in use-case descriptions.
export function labelRanges(
  description,
  label,
  { caseSensitive = false } = {},
) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return [];
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`,
    caseSensitive ? "gu" : "giu",
  );
  return Array.from(description.matchAll(pattern), (match) => ({
    start: match.index,
    end: match.index + match[0].length,
    label: match[0],
  }));
}

export function mentionRanges(description, mentions, actors) {
  const candidates = [];
  for (const mention of mentions ?? []) {
    const actor = actors.find(
      (item) => item.id === mention.actorId && item.accepted === true,
    );
    if (!actor) continue;
    for (const range of labelRanges(description, mention.label, {
      caseSensitive: true,
    })) {
      candidates.push({ ...range, actor });
    }
  }
  candidates.sort(
    (a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start,
  );
  const selected = [];
  for (const candidate of candidates) {
    if (
      !selected.some(
        (range) => candidate.start < range.end && candidate.end > range.start,
      )
    ) {
      selected.push(candidate);
    }
  }
  return selected.sort((a, b) => a.start - b.start);
}

export function availableActorRanges(description, actor, mentions, actors) {
  const occupied = mentionRanges(description, mentions, actors);
  return labelRanges(description, actor.name).filter(
    (range) =>
      !occupied.some(
        (existing) => range.start < existing.end && range.end > existing.start,
      ),
  );
}

export function linkMatchingActors(state, cases, makeId) {
  const actors = state.actors.filter((actor) => actor.accepted === true);
  const counts = new Map();
  for (const actor of actors) {
    const key = actor.name.trim().toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let changed = false;
  for (const useCase of cases) {
    if (Object.hasOwn(useCase, "actorMentions")) continue;
    const candidates = actors.filter(
      (actor) => counts.get(actor.name.trim().toLowerCase()) === 1,
    );
    const pending = candidates
      .flatMap((actor) =>
        labelRanges(useCase.description, actor.name).map((range) => ({
          ...range,
          actor,
        })),
      )
      .sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);
    const selected = [];
    for (const range of pending) {
      if (
        selected.some(
          (item) => range.start < item.end && range.end > item.start,
        )
      )
        continue;
      selected.push(range);
    }
    if (!selected.length) continue;
    useCase.actorMentions = [];
    for (const { actor, label } of selected) {
      actor.id ??= makeId();
      if (
        !useCase.actorMentions.some(
          (item) => item.actorId === actor.id && item.label === label,
        )
      ) {
        useCase.actorMentions.push({ actorId: actor.id, label });
      }
    }
    changed = true;
  }
  return changed;
}

export function actorIsReferenced(state, actorId) {
  return (
    Boolean(actorId) &&
    [...(state.useCases ?? []), ...(state.archivedUseCases ?? [])].some(
      (useCase) =>
        useCase.actorMentions?.some((mention) => mention.actorId === actorId),
    )
  );
}
