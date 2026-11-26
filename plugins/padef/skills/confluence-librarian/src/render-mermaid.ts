import { readFileSync, writeFileSync } from "node:fs";
import { render, type RenderResult } from "pele";

export const usage = "usage: render-mermaid.mjs <fence-file|-> <output.svg>";

export function renderFence(source: string): RenderResult {
  return render(source);
}

export function run(argv: string[]): number {
  const [fenceArg, outPath] = argv;
  if (!fenceArg || !outPath) {
    console.error(usage);
    return 2;
  }

  let source: string;
  try {
    source =
      fenceArg === "-"
        ? readFileSync(0, "utf8")
        : readFileSync(fenceArg, "utf8");
  } catch (error) {
    console.error(`error ${(error as Error).message}`);
    return 1;
  }

  let diagram: RenderResult;
  try {
    diagram = renderFence(source);
  } catch (error) {
    // The stack trace carries the whole bundle; the message is the signal.
    console.error(`error ${(error as Error).message}`);
    return 1;
  }

  writeFileSync(outPath, diagram.svg);
  console.log(
    `rendered ${diagram.type} ${diagram.width}x${diagram.height} -> ${outPath}`,
  );
  return 0;
}
