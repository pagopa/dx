// Extracts one complete element from a persisted Confluence HTML baseline.
import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const VOID_ELEMENTS = new Set(
  "area base br col embed hr img input link meta param source track wbr".split(
    " ",
  ),
);
const RAW_TEXT_ELEMENTS = new Set(["script", "style", "textarea", "title"]);
// Numeric references cover most of what Confluence emits, so this table only
// carries the names that survive a round trip: markup, whitespace, the
// typography that Word pastes leave behind, and accented Latin letters.
const NAMED_ENTITIES = new Map(
  Object.entries({
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: "\u00a0",
    ndash: "\u2013",
    mdash: "\u2014",
    hellip: "\u2026",
    lsquo: "\u2018",
    rsquo: "\u2019",
    ldquo: "\u201c",
    rdquo: "\u201d",
    laquo: "\u00ab",
    raquo: "\u00bb",
    bull: "\u2022",
    middot: "\u00b7",
    copy: "\u00a9",
    reg: "\u00ae",
    trade: "\u2122",
    deg: "\u00b0",
    plusmn: "\u00b1",
    times: "\u00d7",
    euro: "\u20ac",
    agrave: "\u00e0",
    aacute: "\u00e1",
    egrave: "\u00e8",
    eacute: "\u00e9",
    igrave: "\u00ec",
    iacute: "\u00ed",
    ograve: "\u00f2",
    oacute: "\u00f3",
    ugrave: "\u00f9",
    uacute: "\u00fa",
    Agrave: "\u00c0",
    Egrave: "\u00c8",
    Eacute: "\u00c9",
    Igrave: "\u00cc",
    Ograve: "\u00d2",
    Ugrave: "\u00d9",
  }),
);

// Decoded text is what `--text` is matched against, so a needle typed as it
// reads on the page has to find `perch&eacute;` and `&#8212;` alike. A single
// pass keeps `&amp;lt;` at one level, and anything unknown stays untouched.
function decodeEntities(value) {
  return value.replace(
    /&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|([a-zA-Z][a-zA-Z0-9]*));/g,
    (entity, decimal, hexadecimal, name) => {
      if (name) {
        return NAMED_ENTITIES.get(name) ?? entity;
      }
      const codePoint = decimal
        ? Number(decimal)
        : Number.parseInt(hexadecimal, 16);
      const unrepresentable =
        codePoint === 0 ||
        codePoint > 0x10ffff ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff);
      return unrepresentable ? entity : String.fromCodePoint(codePoint);
    },
  );
}

function tagEnd(html, start) {
  let quote = null;
  for (let i = start + 1; i < html.length; i += 1) {
    const character = html[i];
    if (quote) {
      if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === ">") {
      return i + 1;
    }
  }
  return html.length;
}

function parseAttributes(source) {
  const attributes = new Map();
  const pattern =
    /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]*)))?/g;
  for (const match of source.matchAll(pattern)) {
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    attributes.set(match[1].toLowerCase(), decodeEntities(value));
  }
  return attributes;
}

export function scanHtml(html) {
  const lower = html.toLowerCase();
  const elements = [];
  const texts = [];
  const open = [];
  let cursor = 0;
  let textStart = 0;

  const closeElement = (name, end) => {
    for (let i = open.length - 1; i >= 0; i -= 1) {
      if (open[i].tag === name) {
        open[i].end = end;
        open.length = i;
        return;
      }
    }
  };

  while (cursor < html.length) {
    const tagStart = html.indexOf("<", cursor);
    if (tagStart === -1) {
      break;
    }
    if (tagStart > textStart) {
      texts.push({
        start: textStart,
        end: tagStart,
        value: html.slice(textStart, tagStart),
        parent: open.at(-1) ?? null,
      });
    }

    if (lower.startsWith("<!--", tagStart)) {
      const end = html.indexOf("-->", tagStart);
      cursor = end === -1 ? html.length : end + 3;
      textStart = cursor;
      continue;
    }
    if (lower.startsWith("<![cdata[", tagStart)) {
      const end = lower.indexOf("]]>", tagStart);
      cursor = end === -1 ? html.length : end + 3;
      textStart = cursor;
      continue;
    }
    if (lower.startsWith("<!", tagStart) || lower.startsWith("<?", tagStart)) {
      const end = html.indexOf(">", tagStart);
      cursor = end === -1 ? html.length : end + 1;
      textStart = cursor;
      continue;
    }

    const end = tagEnd(html, tagStart);
    const tagText = html.slice(tagStart, end);
    const closeTag = /^<\s*\/\s*([a-zA-Z][a-zA-Z0-9:-]*)/.exec(tagText);
    if (closeTag) {
      closeElement(closeTag[1].toLowerCase(), end);
      cursor = end;
      textStart = end;
      continue;
    }

    const openTag = /^<\s*([a-zA-Z][a-zA-Z0-9:-]*)/.exec(tagText);
    if (!openTag) {
      cursor = end;
      textStart = end;
      continue;
    }

    const tag = openTag[1].toLowerCase();
    const attributes = parseAttributes(tagText.slice(openTag[0].length));
    const element = {
      tag,
      start: tagStart,
      end: null,
      localId: attributes.get("data-local-id"),
      parent: open.at(-1) ?? null,
      selfClosing: VOID_ELEMENTS.has(tag) || /\/\s*>$/.test(tagText),
    };
    elements.push(element);

    if (element.selfClosing) {
      element.end = end;
      cursor = end;
      textStart = end;
      continue;
    }

    if (RAW_TEXT_ELEMENTS.has(tag)) {
      const closing = lower.indexOf(`</${tag}`, end);
      const rawEnd = closing === -1 ? html.length : tagEnd(html, closing);
      element.end = rawEnd;
      cursor = rawEnd;
      textStart = rawEnd;
      continue;
    }

    open.push(element);
    cursor = end;
    textStart = end;
  }

  if (textStart < html.length) {
    texts.push({
      start: textStart,
      end: html.length,
      value: html.slice(textStart),
      parent: open.at(-1) ?? null,
    });
  }
  for (const element of open) {
    element.end = html.length;
  }

  return { elements, texts };
}

function describe(element) {
  return element.localId
    ? `${element.tag}[local-id=${element.localId}]`
    : element.tag;
}

export function describePath(element) {
  const chain = [];
  for (let current = element; current; current = current.parent) {
    chain.unshift(describe(current));
  }
  return chain.length > 6
    ? ["…", ...chain.slice(-5)].join(" > ")
    : chain.join(" > ");
}

// `edits` can only address a node that carries a data-local-id, so a text hit
// nested in an anonymous paragraph reports the nearest addressable ancestor.
export function anchorOf(element) {
  for (let current = element; current; current = current.parent) {
    if (current.localId) {
      return current;
    }
  }
  return null;
}

function describeAnchor(element) {
  const anchor = anchorOf(element);
  if (!anchor) {
    return "anchor=(none)";
  }
  return anchor === element
    ? "anchor=self"
    : `anchor=${describe(anchor)} bytes ${anchor.start}-${anchor.end}`;
}

function isWithin(element, ancestor) {
  for (let current = element; current; current = current.parent) {
    if (current === ancestor) {
      return true;
    }
  }
  return false;
}

function countOccurrences(haystack, needle) {
  let count = 0;
  let at = haystack.indexOf(needle);
  while (at !== -1) {
    count += 1;
    at = haystack.indexOf(needle, at + needle.length);
  }
  return count;
}

// Visible text runs across inline markup and entities, so a needle is matched
// against each element's decoded descendant text, then narrowed to the
// smallest hit: "rollout date" in `<p>rollout <strong>date</strong></p>`
// selects the paragraph. An ancestor is dropped only when descendants account
// for all of its occurrences, because it may hold a separate one of its own:
// `<p>rollout date; previous <strong>rollout date</strong></p>` keeps both.
function smallestTextHits(texts, needle) {
  const byElement = new Map();
  for (const segment of texts) {
    const decoded = decodeEntities(segment.value);
    for (let node = segment.parent; node; node = node.parent) {
      byElement.set(node, (byElement.get(node) ?? "") + decoded);
    }
  }
  const counts = new Map();
  for (const [element, value] of byElement) {
    const count = countOccurrences(value, needle);
    if (count > 0) {
      counts.set(element, count);
    }
  }
  const covered = new Map();
  for (const [element, count] of counts) {
    for (let node = element.parent; node; node = node.parent) {
      if (counts.has(node)) {
        covered.set(node, (covered.get(node) ?? 0) + count);
        break;
      }
    }
  }
  return [...counts.keys()].filter(
    (element) => counts.get(element) > (covered.get(element) ?? 0),
  );
}

export function findElements(html, { localId, text } = {}) {
  const { elements, texts } = scanHtml(html);
  const scoped = localId
    ? elements.filter((element) => element.localId === localId)
    : null;
  if (scoped && scoped.length === 0) {
    return { matches: [], textMisses: [] };
  }
  if (!text) {
    return { matches: scoped ?? [], textMisses: [] };
  }

  const matches = [];
  const textMisses = [];
  for (const element of smallestTextHits(texts, text)) {
    if (scoped && !scoped.some((scope) => isWithin(element, scope))) {
      textMisses.push(element);
      continue;
    }
    matches.push(element);
  }
  return { matches, textMisses };
}

export function describeMatches(html, elements, { list = false } = {}) {
  const sorted = [...elements].sort((left, right) => left.start - right.start);
  if (list) {
    return sorted
      .map(
        (element, index) =>
          `${index + 1}/${sorted.length} ${describePath(element)} — bytes ` +
          `${element.start}-${element.end} — ${describeAnchor(element)}`,
      )
      .join("\n");
  }
  return sorted
    .map((element, index) => {
      const body = html.slice(element.start, element.end);
      const header =
        `match ${index + 1}/${sorted.length} — <${element.tag}> — ` +
        `bytes ${element.start}-${element.end} (${body.length}) — ` +
        `data-local-id=${element.localId ?? "(none)"} — ` +
        describeAnchor(element);
      const lines = [header, `path: ${describePath(element)}`];
      if (!anchorOf(element)) {
        lines.push(
          "note: no data-local-id on this node or its ancestors — a " +
            "granular edit cannot address it; use a full body update.",
        );
      }
      lines.push(body);
      return lines.join("\n");
    })
    .join("\n\n");
}

export function ambiguityHint(elements, limit = 10) {
  const sorted = [...elements].sort((left, right) => left.start - right.start);
  const shown = sorted
    .slice(0, limit)
    .map(
      (element, index) =>
        `  ${index + 1}. ${describePath(element)} — bytes ` +
        `${element.start}-${element.end} — ${describeAnchor(element)}`,
    );
  if (sorted.length > shown.length) {
    shown.push(`  … ${sorted.length - shown.length} more (use --list)`);
  }
  return (
    `Ambiguous: ${sorted.length} elements match. Re-run with the exact ` +
    `--local-id:\n${shown.join("\n")}`
  );
}

const BODY_EXTRACTORS = [
  (parsed) => parsed?.data?.body?.value,
  (parsed) => parsed?.data?.value,
  (parsed) => parsed?.body?.value,
  (parsed) => parsed?.value,
];

/**
 * Accepts raw HTML or a saved MCP tool-output envelope and returns the HTML body.
 * An envelope holds the page under `data.body.value`; anything else passes through.
 */
export function unwrapBody(source) {
  const candidate = source.replace(/^\uFEFF/, "").trimStart();
  if (!candidate.startsWith("{")) {
    return source;
  }
  let parsed;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return source;
  }
  for (const pick of BODY_EXTRACTORS) {
    const value = pick(parsed);
    if (typeof value === "string" && value.includes("<")) {
      return value;
    }
  }
  return source;
}

function parseArgs(argv) {
  const options = { list: false, json: false, all: false };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const argument = argv[i];
    if (argument === "--local-id" || argument === "--text") {
      const value = argv[i + 1];
      if (value === undefined) {
        throw new Error(`${argument} needs a value.`);
      }
      options[argument === "--local-id" ? "localId" : "text"] = value;
      i += 1;
    } else if (argument === "--list") {
      options.list = true;
    } else if (argument === "--json") {
      options.json = true;
    } else if (argument === "--all") {
      options.all = true;
    } else if (argument.startsWith("-") && argument !== "-") {
      throw new Error(`Unknown option ${argument}.`);
    } else {
      positional.push(argument);
    }
  }
  if (positional.length !== 1) {
    throw new Error(
      "Usage: node extract-node.js <baseline.html|-> " +
        "(--local-id <id> | --text <needle>) [--list] [--json] [--all]. " +
        "The file may be raw HTML or a saved MCP tool-output envelope.",
    );
  }
  if (!options.localId && !options.text) {
    throw new Error("Pass --local-id or --text to select an element.");
  }
  return { file: positional[0], options };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const { file, options } = parseArgs(process.argv.slice(2));
  const source =
    file === "-" ? await readStdin() : await readFile(resolve(file), "utf8");
  const html = unwrapBody(source);
  const { matches, textMisses } = findElements(html, options);

  if (matches.length === 0) {
    const tried = options.text
      ? `text ${JSON.stringify(options.text)}`
      : `local-id ${JSON.stringify(options.localId)}`;
    const hint = textMisses.length
      ? " The text matched outside the requested local-id only."
      : "";
    console.error(`No element matches ${tried}.${hint}`);
    process.exitCode = 1;
    return;
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        matches.map((element) => {
          const anchor = anchorOf(element);
          return {
            tag: element.tag,
            localId: element.localId ?? null,
            start: element.start,
            end: element.end,
            path: describePath(element),
            anchor: anchor
              ? {
                  tag: anchor.tag,
                  localId: anchor.localId,
                  start: anchor.start,
                  end: anchor.end,
                }
              : null,
            html: options.list
              ? undefined
              : html.slice(element.start, element.end),
          };
        }),
        null,
        2,
      ),
    );
  } else if (options.list) {
    console.log(describeMatches(html, matches, { list: true }));
  } else if (matches.length > 1 && !options.all) {
    console.log(ambiguityHint(matches));
  } else {
    console.log(describeMatches(html, matches));
  }

  if (matches.length > 1) {
    process.exitCode = 2;
  }
}

// Compare real paths: a skill is often reached through a symlinked directory
// (a staged plugin copy, /tmp on macOS), and a mismatch skips main() silently.
const entryPoint = realpathSync(fileURLToPath(import.meta.url));

if (process.argv[1] && realpathSync(process.argv[1]) === entryPoint) {
  try {
    await main();
  } catch (error) {
    console.error(`Extraction failed: ${error.message}`);
    process.exitCode = 1;
  }
}
