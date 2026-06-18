/**
 * Infers the narrowest Docker build context that still satisfies local COPY/ADD sources.
 */
import path from "node:path";
import { existsSync, readdirSync, readFileSync } from "node:fs";

const normalizePath = (value: string) => value.replaceAll(path.sep, "/");
const ignoredContextDirectoryNames = new Set([".git", "node_modules"]);
const copyOrAddInstructionPattern = /^(COPY|ADD)\s+/i;
const shellTokenPattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
const wildcardPattern = /[*?[]/;

// Dockerfiles are small enough that a full read keeps the heuristics simple and deterministic.
const readDockerfile = (dockerfilePath: string) =>
  readFileSync(dockerfilePath, "utf8").replaceAll("\r\n", "\n");

const normalizeDockerSourcePath = (sourcePath: string) => {
  const normalizedSourcePath = normalizePath(sourcePath.trim()).replace(/^\.\//, "");
  return normalizedSourcePath.length > 0 ? normalizedSourcePath : ".";
};

const getInstructionLines = (dockerfileContent: string) => {
  const instructions: string[] = [];
  let currentInstruction = "";

  for (const rawLine of dockerfileContent.split("\n")) {
    const trimmedLine = rawLine.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    currentInstruction = currentInstruction
      ? `${currentInstruction} ${trimmedLine}`
      : trimmedLine;

    if (trimmedLine.endsWith("\\")) {
      currentInstruction = currentInstruction.slice(0, -1).trim();
      continue;
    }

    instructions.push(currentInstruction);
    currentInstruction = "";
  }

  if (currentInstruction) {
    instructions.push(currentInstruction);
  }

  return instructions;
};

const tokenizeShellArguments = (value: string) =>
  Array.from(value.matchAll(shellTokenPattern), (match) =>
    match[1] ?? match[2] ?? match[3] ?? "",
  );

const hasStageCopyFlag = (tokens: string[]) =>
  tokens.some((token) => token === "--from" || token.startsWith("--from="));

const stripCopyFlags = (tokens: string[]) => {
  const sourceTokens: string[] = [];
  let skipNextToken = false;

  for (const token of tokens) {
    if (skipNextToken) {
      skipNextToken = false;
      continue;
    }

    if (!token.startsWith("--")) {
      sourceTokens.push(token);
      continue;
    }

    if (!token.includes("=")) {
      skipNextToken = true;
    }
  }

  return sourceTokens;
};

const parseJsonInstructionSources = (instructionBody: string): string[] | null => {
  const jsonStartIndex = instructionBody.indexOf("[");

  if (jsonStartIndex === -1) {
    return null;
  }

  const flagTokens = tokenizeShellArguments(
    instructionBody.slice(0, jsonStartIndex).trim(),
  );

  if (hasStageCopyFlag(flagTokens)) {
    return [];
  }

  try {
    const parsedInstruction = JSON.parse(instructionBody.slice(jsonStartIndex));

    if (
      !Array.isArray(parsedInstruction) ||
      parsedInstruction.length < 2 ||
      !parsedInstruction.every((value) => typeof value === "string")
    ) {
      return [];
    }

    return parsedInstruction.slice(0, -1);
  } catch {
    return [];
  }
};

const parseShellInstructionSources = (instructionBody: string) => {
  const tokens = tokenizeShellArguments(instructionBody);

  if (hasStageCopyFlag(tokens)) {
    return [];
  }

  const sourceAndDestinationTokens = stripCopyFlags(tokens);

  return sourceAndDestinationTokens.length >= 2
    ? sourceAndDestinationTokens.slice(0, -1)
    : [];
};

const isRemoteAddSource = (sourcePath: string) => /^[a-z][a-z0-9+.-]*:\/\//i.test(sourcePath);

const getLocalBuildSources = (dockerfileContent: string) =>
  getInstructionLines(dockerfileContent)
    .filter((instruction) => copyOrAddInstructionPattern.test(instruction))
    .flatMap((instruction) => {
      const instructionBody = instruction.replace(copyOrAddInstructionPattern, "").trim();
      const jsonInstructionSources = parseJsonInstructionSources(instructionBody);

      return jsonInstructionSources ?? parseShellInstructionSources(instructionBody);
    })
    .map(normalizeDockerSourcePath)
    .filter((sourcePath) => !isRemoteAddSource(sourcePath));

const getAncestorCandidateContexts = (
  workspaceRoot: string,
  projectRoot: string,
) => {
  const candidateContexts: string[] = [];
  const workspaceRootAbsolutePath = path.resolve(workspaceRoot);
  let currentContext = path.resolve(workspaceRoot, projectRoot);

  while (true) {
    candidateContexts.push(currentContext);

    if (currentContext === workspaceRootAbsolutePath) {
      return candidateContexts;
    }

    const parentContext = path.dirname(currentContext);

    if (
      parentContext === currentContext ||
      !parentContext.startsWith(workspaceRootAbsolutePath)
    ) {
      return candidateContexts;
    }

    currentContext = parentContext;
  }
};

const getNestedCandidateContexts = (workspaceRoot: string, projectRoot: string) => {
  const projectRootAbsolutePath = path.resolve(workspaceRoot, projectRoot);

  if (!existsSync(projectRootAbsolutePath)) {
    return [];
  }

  return readdirSync(projectRootAbsolutePath, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        !ignoredContextDirectoryNames.has(entry.name),
    )
    .map((entry) => path.join(projectRootAbsolutePath, entry.name));
};

const getSourceBasePath = (sourcePath: string) => {
  // Wildcard COPY sources can only be validated up to their fixed path prefix.
  if (!wildcardPattern.test(sourcePath)) {
    return sourcePath;
  }

  const firstWildcardIndex = sourcePath.search(wildcardPattern);
  const fixedPrefix = sourcePath.slice(0, firstWildcardIndex).replace(/\/$/, "");

  if (!fixedPrefix) {
    return ".";
  }

  const lastSlashIndex = fixedPrefix.lastIndexOf("/");

  return lastSlashIndex === -1 ? fixedPrefix : fixedPrefix.slice(0, lastSlashIndex);
};

const canResolveSourceFromContext = (
  candidateContext: string,
  sourcePath: string,
) => {
  if (sourcePath === ".") {
    return true;
  }

  if (sourcePath.startsWith("../")) {
    return false;
  }

  const sourceBasePath = getSourceBasePath(sourcePath);

  return existsSync(path.join(candidateContext, sourceBasePath));
};

const getPathDepth = (workspaceRoot: string, directoryPath: string) => {
  const relativePath = normalizePath(path.relative(workspaceRoot, directoryPath));

  return relativePath.length === 0 ? 0 : relativePath.split("/").length;
};

const toWorkspaceRelativePath = (workspaceRoot: string, directoryPath: string) => {
  const relativePath = normalizePath(path.relative(workspaceRoot, directoryPath));
  return relativePath.length > 0 ? relativePath : ".";
};

const selectBuildContext = (
  workspaceRoot: string,
  projectRoot: string,
  dockerfileContent: string,
) => {
  const localBuildSources = getLocalBuildSources(dockerfileContent);

  if (localBuildSources.length === 0) {
    return normalizePath(projectRoot);
  }

  // Prefer the deepest valid directory so Docker sends the smallest context possible.
  const candidateContexts = Array.from(
    new Set([
      ...getNestedCandidateContexts(workspaceRoot, projectRoot),
      ...getAncestorCandidateContexts(workspaceRoot, projectRoot),
    ]),
  );
  const validContexts = candidateContexts
    .filter((candidateContext) =>
      localBuildSources.every((sourcePath) =>
        canResolveSourceFromContext(candidateContext, sourcePath),
      ),
    )
    .sort((leftContext, rightContext) => {
      const depthDelta = getPathDepth(workspaceRoot, rightContext) - getPathDepth(workspaceRoot, leftContext);
      return depthDelta !== 0 ? depthDelta : leftContext.localeCompare(rightContext);
    });

  return validContexts[0]
    ? toWorkspaceRelativePath(workspaceRoot, validContexts[0])
    : normalizePath(projectRoot);
};

export const getDockerBuildContext = (
  workspaceRoot: string,
  projectRoot: string,
  dockerfilePath: string,
) => {
  const resolvedDockerfilePath = path.isAbsolute(dockerfilePath)
    ? dockerfilePath
    : path.join(workspaceRoot, dockerfilePath);
  const dockerfileContent = readDockerfile(resolvedDockerfilePath);

  return selectBuildContext(workspaceRoot, projectRoot, dockerfileContent);
};

export const getDockerfileArgument = (
  buildContext: string,
  dockerfilePath: string,
) => {
  // Docker expects the file path to be relative to the chosen build context.
  const contextDirectory = buildContext === "." ? "." : buildContext;
  const relativeDockerfile = normalizePath(
    path.relative(contextDirectory, dockerfilePath),
  );

  return relativeDockerfile.length > 0 ? relativeDockerfile : "Dockerfile";
};