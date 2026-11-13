// Eval setup: writes an existing snapshot from a seed bundle, as a previous run would have left it.
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const { key, files } = JSON.parse(readFileSync(process.argv[2], "utf8"));
const cacheHome = process.env.XDG_CACHE_HOME || join(homedir(), ".cache");
const snapshotDirectory = join(cacheHome, "padef", "snapshots", key);
const generation = "000000000001";
const directory = join(snapshotDirectory, "generations", generation);
await mkdir(directory, { recursive: true, mode: 0o700 });
for (const [name, content] of Object.entries(files)) {
  await writeFile(join(directory, name), content, { mode: 0o444 });
  await chmod(join(directory, name), 0o444);
}
await writeFile(join(snapshotDirectory, "CURRENT"), `${generation}\n`, {
  mode: 0o444,
});
console.log(`Seeded ${key} snapshot at ${directory}`);
