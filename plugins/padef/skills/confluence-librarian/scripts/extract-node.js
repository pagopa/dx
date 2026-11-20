// Extracts one complete element from a persisted Confluence HTML baseline.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const VOID_ELEMENTS = new Set(
  "area base br col embed hr img input link meta param source track wbr".split(
    " ",
  ),
);
const RAW_TEXT_ELEMENTS = new Set(["script", "style", "textarea", "title"]);
const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": "\u00a0",
};

function decodeEntities(value) {
  return value.replaceAll(
    /&(?:amp|lt|gt|quot|#39|apos|nbsp);/g,
    (entity) => ENTITIES[entity] ?? entity,
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

function innermostContainer(elements, offset) {
  let found = null;
  for (const element of elements) {
    if (
      element.end === null ||
      element.start > offset ||
      offset >= element.end
    ) {
      continue;
    }
    if (!found || element.end - element.start < found.end - found.start) {
      found = element;
    }
  }
  return found;
}

function isWithin(element, ancestor) {
  for (let current = element; current; current = current.parent) {
    if (current === ancestor) {
      return true;
    }
  }
  return false;
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
  for (const segment of texts) {
    let from = 0;
    for (;;) {
      const at = segment.value.indexOf(text, from);
      if (at === -1) {
        break;
      }
      from = at + text.length;
      const container = innermostContainer(elements, segment.start + at);
      if (!container) {
        continue;
      }
      if (scoped && !scoped.some((element) => isWithin(container, element))) {
        textMisses.push(container);
        continue;
      }
      if (!matches.includes(container)) {
        matches.push(container);
      }
    }
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
          `${element.start}-${element.end}`,
      )
      .join("\n");
  }
  return sorted
    .map((element, index) => {
      const body = html.slice(element.start, element.end);
      const header =
        `match ${index + 1}/${sorted.length} — <${element.tag}> — ` +
        `bytes ${element.start}-${element.end} (${body.length}) — ` +
        `data-local-id=${element.localId ?? "(none)"}`;
      return [header, `path: ${describePath(element)}`, body].join("\n");
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
        `${element.start}-${element.end}`,
    );
  if (sorted.length > shown.length) {
    shown.push(`  … ${sorted.length - shown.length} more (use --list)`);
  }
  return (
    `Ambiguous: ${sorted.length} elements match. Re-run with the exact ` +
    `--local-id:\n${shown.join("\n")}`
  );
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
        "(--local-id <id> | --text <needle>) [--list] [--json] [--all]",
    );
  }
  if (!options.localId && !options.text) {
    throw new Error("Pass --local-id or --text to select an element.");
  }
  return { file: positional[0], options };
}

async function main() {
  const { file, options } = parseArgs(process.argv.slice(2));
  const html =
    file === "-"
      ? await readFile(0, "utf8")
      : await readFile(resolve(file), "utf8");
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
        matches.map((element) => ({
          tag: element.tag,
          localId: element.localId ?? null,
          start: element.start,
          end: element.end,
          path: describePath(element),
          html: options.list
            ? undefined
            : html.slice(element.start, element.end),
        })),
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

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await main();
  } catch (error) {
    console.error(`Extraction failed: ${error.message}`);
    process.exitCode = 1;
  }
}
