/**
 * Spawn the backend scenario runner as a separate Node.js process.
 */
import { spawn } from "node:child_process";
import { once } from "node:events";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface RunScenarioOptions {
  env?: NodeJS.ProcessEnv;
  nodeArgs?: readonly string[];
  scenario: string;
}

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const scenarioRunnerPath = fileURLToPath(
  new URL("./scenario-runner.mjs", import.meta.url),
);

const sanitizeEnv = (environment: NodeJS.ProcessEnv = {}) =>
  Object.fromEntries(
    Object.entries(environment).filter(([, value]) => value !== undefined),
  );

const parseJsonOutput = (stdout: string) => {
  const trimmed = stdout.trim();

  if (!trimmed) {
    return null;
  }

  const lastLine = trimmed.split(/\r?\n/u).at(-1);

  if (!lastLine) {
    return null;
  }

  return JSON.parse(lastLine);
};

export const runScenario = async ({
  env,
  nodeArgs,
  scenario,
}: RunScenarioOptions) => {
  const child = spawn(
    process.execPath,
    ["--no-warnings", ...(nodeArgs ?? []), scenarioRunnerPath, scenario],
    {
      cwd: packageRoot,
      env: {
        ...process.env,
        ...sanitizeEnv(env),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const [exitCode] = await once(child, "exit");

  if (exitCode !== 0) {
    throw new Error(
      `Scenario ${scenario} failed with exit code ${String(exitCode)}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
    );
  }

  return parseJsonOutput(stdout);
};
