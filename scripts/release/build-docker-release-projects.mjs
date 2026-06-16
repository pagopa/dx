import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.captureOutput ? ["ignore", "pipe", "inherit"] : "inherit",
    env: {
      ...process.env,
      ...(options.env ?? {}),
    },
    windowsHide: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return (result.stdout ?? "").trim();
}

function toPatternArray(value) {
  if (Array.isArray(value)) {
    return value.filter(
      (pattern) => typeof pattern === "string" && pattern.length > 0,
    );
  }

  if (typeof value === "string" && value.length > 0) {
    return [value];
  }

  return [];
}

function parseCommaSeparatedList(value) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeImageRef(value) {
  const normalized = value
    .replace(/^[\\/]/, "")
    .replace(/[\\/\s]+/g, "-")
    .toLowerCase();

  return normalized.length > 128 ? normalized.slice(-128) : normalized;
}

function sanitizePackageName(packageName) {
  if (packageName.startsWith("@") && packageName.includes("/")) {
    return packageName.split("/")[1];
  }

  return packageName;
}

function imageExists(imageRefWithTag) {
  const result = spawnSync("docker", ["image", "inspect", imageRefWithTag], {
    stdio: "ignore",
    windowsHide: true,
  });

  return result.status === 0;
}

function rebuildProjectDockerImage(projectName) {
  run("npx", ["nx", "run", `${projectName}:docker:build`, "--skipNxCache"], {
    env: { DOCKER_BUILDKIT: "1" },
  });
}

function getProjectRoot(projectName) {
  const projectJson = run(
    "npx",
    ["nx", "show", "project", projectName, "--json"],
    {
      captureOutput: true,
    },
  );
  const parsed = JSON.parse(projectJson);

  return parsed.root ?? parsed.data?.root ?? null;
}

function getProjectPackageName(projectRoot) {
  const packageJsonPath = join(projectRoot, "package.json");
  if (!existsSync(packageJsonPath)) {
    return null;
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  if (typeof packageJson.name !== "string" || packageJson.name.length === 0) {
    return null;
  }

  return sanitizePackageName(packageJson.name);
}

function ensureNxExpectedImageRefs(projectNames) {
  for (const projectName of projectNames) {
    const projectRoot = getProjectRoot(projectName);
    if (!projectRoot) {
      continue;
    }

    const expectedRef = normalizeImageRef(projectRoot);
    const expectedWithTag = `${expectedRef}:latest`;
    if (imageExists(expectedWithTag)) {
      continue;
    }

    rebuildProjectDockerImage(projectName);
    if (imageExists(expectedWithTag)) {
      continue;
    }

    const fallbackRefs = [
      normalizeImageRef(projectName),
      normalizeImageRef(basename(projectRoot)),
      normalizeImageRef(getProjectPackageName(projectRoot) ?? ""),
    ].filter(
      (value, index, array) =>
        value.length > 0 && array.indexOf(value) === index,
    );

    let recovered = false;
    for (const fallbackRef of fallbackRefs) {
      const fallbackWithTag = `${fallbackRef}:latest`;
      if (!imageExists(fallbackWithTag)) {
        continue;
      }

      run("docker", ["tag", fallbackWithTag, expectedWithTag]);
      recovered = true;
      break;
    }

    if (!recovered) {
      console.error(
        `Could not find a local Docker image for project '${projectName}'. Expected '${expectedWithTag}', looked for fallbacks: ${fallbackRefs
          .map((ref) => `${ref}:latest`)
          .join(", ")}`,
      );
      process.exit(1);
    }
  }
}

function resolveProjectsByPatterns(patterns) {
  if (patterns.length === 0) {
    return [];
  }

  const resolved = run(
    "npx",
    ["nx", "show", "projects", `--projects=${patterns.join(",")}`, "--sep=,"],
    { captureOutput: true },
  );

  return parseCommaSeparatedList(resolved);
}

function getReleaseProjectNames() {
  const nxJson = JSON.parse(readFileSync("nx.json", "utf8"));
  const releaseConfig = nxJson.release ?? {};

  const topLevelPatterns = toPatternArray(releaseConfig.projects);
  if (topLevelPatterns.length > 0) {
    return resolveProjectsByPatterns(topLevelPatterns);
  }

  const groups = releaseConfig.groups;
  if (!groups || typeof groups !== "object") {
    return [];
  }

  const releaseProjects = new Set();
  for (const groupConfig of Object.values(groups)) {
    const groupPatterns = toPatternArray(groupConfig?.projects);
    const groupProjects = resolveProjectsByPatterns(groupPatterns);
    for (const projectName of groupProjects) {
      releaseProjects.add(projectName);
    }
  }

  return Array.from(releaseProjects);
}

const releaseProjectNames = getReleaseProjectNames();
if (releaseProjectNames.length === 0) {
  console.log("No release projects configured. Skipping Docker pre-build.");
  process.exit(0);
}

const dockerProjects = run(
  "npx",
  [
    "nx",
    "show",
    "projects",
    `--projects=${releaseProjectNames.join(",")}`,
    "--with-target=docker:build",
    "--sep=,",
  ],
  { captureOutput: true },
);

const dockerProjectList = parseCommaSeparatedList(dockerProjects);
if (dockerProjectList.length === 0) {
  console.log(
    "No Docker projects found in release scope. Skipping Docker pre-build.",
  );
  process.exit(0);
}

run(
  "npx",
  [
    "nx",
    "run-many",
    "-t",
    "docker:build",
    `--projects=${dockerProjectList.join(",")}`,
  ],
  {
    env: { DOCKER_BUILDKIT: "1" },
  },
);

ensureNxExpectedImageRefs(dockerProjectList);
