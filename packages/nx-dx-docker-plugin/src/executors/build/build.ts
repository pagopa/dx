/**
 * Builds Docker images while expanding CI-oriented metadata tags and labels at runtime.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { type BuildExecutorOptions, buildExecutorSchema } from "./schema.ts";

interface BuildExecutorContext {
  projectName?: string;
  root: string;
}

export interface MetadataRuntimeContext {
  branchName: string | null;
  commitSha: string | null;
  defaultBranch: string;
  gitRef: string | null;
  isDefaultBranch: boolean;
  major: string | null;
  minor: string | null;
  patch: string | null;
  projectName: string | null;
  refName: string | null;
  shortCommitSha: string | null;
  version: string | null;
  versionTag: string | null;
}

const envTemplatePattern = /\$\{\{\s*env\.([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
const tagArgumentPatterns = [/^--tag\s+(.+)$/, /^-t\s+(.+)$/];
const templateTokenPattern = /{{\s*([A-Za-z_]+)\s*}}/g;
const githubStartsWithPattern =
  /^\$\{\{\s*(!)?startsWith\(github\.ref,\s*['"]([^'"]+)['"]\)\s*\}\}$/;
const versionTagPattern = /(?:^|@)(v?\d+\.\d+\.\d+.*)$/;
const comparableVersionTagPattern = /^v?(\d+)\.(\d+)\.(\d+)(.*)$/u;

const normalizeArgs = (args: BuildExecutorOptions["args"]) =>
  Array.isArray(args) ? args.filter((arg): arg is string => typeof arg === "string") : [];

const runGitCommand = (workspaceRoot: string, command: string) => {
  try {
    return execSync(command, {
      cwd: workspaceRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    }).trim();
  } catch {
    return null;
  }
};

const resolveAbsolutePath = (workspaceRoot: string, value: string) =>
  path.isAbsolute(value) ? value : path.resolve(workspaceRoot, value);

const parseEnvFile = (workspaceRoot: string, envFilePath: string) => {
  const absoluteEnvFilePath = resolveAbsolutePath(workspaceRoot, envFilePath);

  if (!existsSync(absoluteEnvFilePath)) {
    throw new Error(`Could not find env file '${absoluteEnvFilePath}'.`);
  }

  return Object.fromEntries(
    readFileSync(absoluteEnvFilePath, "utf8")
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => {
        const normalizedLine = line.startsWith("export ")
          ? line.slice("export ".length)
          : line;
        const separatorIndex = normalizedLine.indexOf("=");

        if (separatorIndex === -1) {
          return [normalizedLine, ""] as const;
        }

        const key = normalizedLine.slice(0, separatorIndex).trim();
        const rawValue = normalizedLine.slice(separatorIndex + 1).trim();
        const value =
          (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
          (rawValue.startsWith("'") && rawValue.endsWith("'"))
            ? rawValue.slice(1, -1)
            : rawValue;

        return [key, value] as const;
      })
      .filter(([key]) => key.length > 0),
  );
};

const extractVersionTag = (refName: string | null | undefined) => {
  if (!refName) {
    return null;
  }

  return refName.match(versionTagPattern)?.[1] ?? null;
};

const parseComparableVersionTag = (versionTag: string) => {
  const match = versionTag.match(comparableVersionTagPattern);

  if (!match) {
    return null;
  }

  const [, major, minor, patch, suffix] = match;

  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    suffix,
  };
};

const compareVersionTags = (leftVersionTag: string, rightVersionTag: string) => {
  const leftVersion = parseComparableVersionTag(leftVersionTag);
  const rightVersion = parseComparableVersionTag(rightVersionTag);

  if (!leftVersion || !rightVersion) {
    return leftVersionTag.localeCompare(rightVersionTag);
  }

  if (leftVersion.major !== rightVersion.major) {
    return leftVersion.major - rightVersion.major;
  }

  if (leftVersion.minor !== rightVersion.minor) {
    return leftVersion.minor - rightVersion.minor;
  }

  if (leftVersion.patch !== rightVersion.patch) {
    return leftVersion.patch - rightVersion.patch;
  }

  if (leftVersion.suffix === rightVersion.suffix) {
    return 0;
  }

  if (!leftVersion.suffix) {
    return 1;
  }

  if (!rightVersion.suffix) {
    return -1;
  }

  return leftVersion.suffix.localeCompare(rightVersion.suffix);
};

const getHeadTags = (workspaceRoot: string) => {
  const headTags = runGitCommand(workspaceRoot, "git tag --points-at HEAD");

  if (!headTags) {
    return [];
  }

  return headTags
    .split(/\r?\n/u)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
};

const getProjectTagAtHead = (workspaceRoot: string, projectName: string | undefined) => {
  if (!projectName) {
    return null;
  }

  const projectTagPrefix = `${projectName}@`;

  return getHeadTags(workspaceRoot)
    .filter((tag) => tag.startsWith(projectTagPrefix))
    .reduce<string | null>((selectedTag, currentTag) => {
      const currentVersionTag = extractVersionTag(currentTag);

      if (!currentVersionTag) {
        return selectedTag;
      }

      if (!selectedTag) {
        return currentTag;
      }

      const selectedVersionTag = extractVersionTag(selectedTag);

      if (!selectedVersionTag) {
        return currentTag;
      }

      return compareVersionTags(currentVersionTag, selectedVersionTag) > 0
        ? currentTag
        : selectedTag;
    }, null);
};

const getGitRef = (workspaceRoot: string, projectName: string | undefined) => {
  const githubRef = process.env.GITHUB_REF?.trim();

  if (githubRef) {
    return githubRef;
  }

  const projectTagAtHead = getProjectTagAtHead(workspaceRoot, projectName);

  if (projectTagAtHead) {
    return `refs/tags/${projectTagAtHead}`;
  }

  const branchName = runGitCommand(workspaceRoot, "git branch --show-current");
  return branchName ? `refs/heads/${branchName}` : null;
};

const getRefName = (workspaceRoot: string, gitRef: string | null) => {
  const githubRefName = process.env.GITHUB_REF_NAME?.trim();

  if (githubRefName) {
    return githubRefName;
  }

  if (!gitRef) {
    return null;
  }

  return gitRef.replace(/^refs\/(heads|tags)\//u, "");
};

const getBranchName = (workspaceRoot: string, gitRef: string | null) => {
  if (gitRef?.startsWith("refs/heads/")) {
    return gitRef.slice("refs/heads/".length);
  }

  const githubHeadRef = process.env.GITHUB_HEAD_REF?.trim();

  if (githubHeadRef) {
    return githubHeadRef;
  }

  return runGitCommand(workspaceRoot, "git branch --show-current");
};

const getDefaultBranch = (workspaceRoot: string) => {
  const githubDefaultBranch = process.env.GITHUB_DEFAULT_BRANCH?.trim();

  if (githubDefaultBranch) {
    return githubDefaultBranch;
  }

  const remoteHead = runGitCommand(workspaceRoot, "git symbolic-ref refs/remotes/origin/HEAD");

  if (remoteHead?.startsWith("refs/remotes/origin/")) {
    return remoteHead.slice("refs/remotes/origin/".length);
  }

  return "main";
};

const getCommitSha = (workspaceRoot: string) =>
  process.env.GITHUB_SHA?.trim() || runGitCommand(workspaceRoot, "git rev-parse HEAD");

export const getRuntimeContext = (
  workspaceRoot: string,
  projectName: string | undefined,
  fallbackVersionTag?: string,
): MetadataRuntimeContext => {
  const gitRef = getGitRef(workspaceRoot, projectName);
  const refName = getRefName(workspaceRoot, gitRef);
  const branchName = getBranchName(workspaceRoot, gitRef);
  const defaultBranch = getDefaultBranch(workspaceRoot);
  const commitSha = getCommitSha(workspaceRoot);
  const versionTag =
    extractVersionTag(fallbackVersionTag) ?? extractVersionTag(refName);
  const version = versionTag?.replace(/^v/u, "") ?? null;
  const [major, minor, patch] = version ? version.split(".", 3) : [];

  return {
    branchName,
    commitSha,
    defaultBranch,
    gitRef,
    isDefaultBranch: branchName === defaultBranch,
    major: major ?? null,
    minor: minor ?? null,
    patch: patch ?? null,
    projectName: projectName ?? null,
    refName,
    shortCommitSha: commitSha?.slice(0, 7) ?? null,
    version,
    versionTag,
  };
};

const interpolateTemplate = (
  value: string,
  context: MetadataRuntimeContext,
) =>
  value
    .replaceAll(envTemplatePattern, (_, envName: string) => process.env[envName] ?? "")
    .replaceAll(templateTokenPattern, (_, token: string) => {
      switch (token) {
        case "branch":
          return context.branchName ?? "";
        case "commit_sha":
        case "commitSha":
          return context.commitSha ?? "";
        case "default_branch":
        case "defaultBranch":
          return context.defaultBranch;
        case "is_default_branch":
        case "isDefaultBranch":
          return String(context.isDefaultBranch);
        case "major":
          return context.major ?? "";
        case "minor":
          return context.minor ?? "";
        case "patch":
          return context.patch ?? "";
        case "project_name":
        case "projectName":
          return context.projectName ?? "";
        case "ref_name":
        case "refName":
          return context.refName ?? "";
        case "sha":
        case "short_sha":
        case "shortCommitSha":
          return context.shortCommitSha ?? "";
        case "version":
          return context.version ?? "";
        case "version_tag":
        case "versionTag":
          return context.versionTag ?? "";
        default:
          return "";
      }
    });

const sanitizeTagValue = (value: string) =>
  value.replaceAll(/[^A-Za-z0-9._-]+/gu, "-").replaceAll(/^-+|-+$/gu, "");

const splitMetadataAttributes = (value: string) => {
  const parts: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let templateDepth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const remaining = value.slice(index);

    if (!quote && (remaining.startsWith("${{") || remaining.startsWith("{{"))) {
      templateDepth += 1;
      current += remaining.startsWith("${{") ? "${{" : "{{";
      index += remaining.startsWith("${{") ? 2 : 1;
      continue;
    }

    if (!quote && templateDepth > 0 && remaining.startsWith("}}")) {
      templateDepth -= 1;
      current += "}}";
      index += 1;
      continue;
    }

    const character = value[index];

    if (templateDepth === 0 && (character === "'" || character === '"')) {
      quote = quote === character ? null : quote ?? character;
      current += character;
      continue;
    }

    if (character === "," && !quote && templateDepth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
};

const parseMetadataSpec = (value: string) =>
  Object.fromEntries(
    splitMetadataAttributes(value)
      .map((part) => {
        const separatorIndex = part.indexOf("=");

        if (separatorIndex === -1) {
          return [part.trim(), ""] as const;
        }

        return [
          part.slice(0, separatorIndex).trim(),
          part.slice(separatorIndex + 1).trim(),
        ] as const;
      })
      .filter(([key]) => key.length > 0),
  );

const evaluateEnableExpression = (
  value: string | undefined,
  context: MetadataRuntimeContext,
) => {
  if (!value) {
    return true;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return true;
  }

  if (trimmedValue === "true") {
    return true;
  }

  if (trimmedValue === "false") {
    return false;
  }

  if (trimmedValue === "{{is_default_branch}}") {
    return context.isDefaultBranch;
  }

  const startsWithMatch = trimmedValue.match(githubStartsWithPattern);

  if (startsWithMatch) {
    const [, negated, prefix] = startsWithMatch;
    const matches = context.gitRef?.startsWith(prefix) ?? false;
    return negated ? !matches : matches;
  }

  return interpolateTemplate(trimmedValue, context) === "true";
};

const extractTagArgumentValue = (value: string) => {
  for (const pattern of tagArgumentPatterns) {
    const match = value.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
};

const getImageBaseReference = (imageReference: string) => {
  const digestIndex = imageReference.indexOf("@");

  if (digestIndex !== -1) {
    return imageReference.slice(0, digestIndex);
  }

  const lastSlashIndex = imageReference.lastIndexOf("/");
  const lastColonIndex = imageReference.lastIndexOf(":");

  return lastColonIndex > lastSlashIndex
    ? imageReference.slice(0, lastColonIndex)
    : imageReference;
};

const normalizeImageReferenceForDeduplication = (imageReference: string) => {
  const digestIndex = imageReference.indexOf("@");

  if (digestIndex !== -1) {
    return imageReference;
  }

  const lastSlashIndex = imageReference.lastIndexOf("/");
  const lastColonIndex = imageReference.lastIndexOf(":");

  return lastColonIndex > lastSlashIndex ? imageReference : `${imageReference}:latest`;
};

const resolveTagSpec = (value: string, context: MetadataRuntimeContext) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return [];
  }

  if (!trimmedValue.startsWith("type=")) {
    const resolvedTag = sanitizeTagValue(interpolateTemplate(trimmedValue, context));
    return resolvedTag ? [resolvedTag] : [];
  }

  const spec = parseMetadataSpec(trimmedValue);

  if (!evaluateEnableExpression(spec.enable, context)) {
    return [];
  }

  switch (spec.type) {
    case "raw": {
      const resolvedTag = sanitizeTagValue(interpolateTemplate(spec.value ?? "", context));
      return resolvedTag ? [resolvedTag] : [];
    }
    case "ref": {
      if (spec.event === "branch" && context.gitRef?.startsWith("refs/heads/")) {
        const resolvedTag = sanitizeTagValue(context.branchName ?? "");
        return resolvedTag ? [resolvedTag] : [];
      }

      if (spec.event === "tag" && context.gitRef?.startsWith("refs/tags/")) {
        const resolvedTag = sanitizeTagValue(context.refName ?? "");
        return resolvedTag ? [resolvedTag] : [];
      }

      return [];
    }
    case "semver": {
      if (!context.version || !spec.pattern) {
        return [];
      }

      const resolvedPattern = interpolateTemplate(spec.pattern, context);
      const resolvedTag = sanitizeTagValue(resolvedPattern);
      return resolvedTag ? [resolvedTag] : [];
    }
    case "sha": {
      return context.shortCommitSha ? [`sha-${context.shortCommitSha}`] : [];
    }
    default:
      return [];
  }
};

const getExistingTagArguments = (args: string[]) =>
  args
    .map(extractTagArgumentValue)
    .filter((value): value is string => value !== null);

export const buildMetadataTagArguments = (
  args: string[],
  metadata: BuildExecutorOptions["metadata"],
  context: MetadataRuntimeContext,
) => {
  if (!metadata?.tags || metadata.tags.length === 0) {
    return [];
  }

  const existingImageReferences = getExistingTagArguments(args);

  if (existingImageReferences.length === 0) {
    return [];
  }

  const baseImageReferences = existingImageReferences.map(getImageBaseReference);
  const existingNormalizedReferences = new Set(
    existingImageReferences.map(normalizeImageReferenceForDeduplication),
  );
  const additionalImageReferences = new Set<string>();

  for (const tagSpec of metadata.tags) {
    for (const resolvedTag of resolveTagSpec(tagSpec, context)) {
      if (!resolvedTag) {
        continue;
      }

      if (resolvedTag.includes("/") || resolvedTag.includes(":")) {
        additionalImageReferences.add(resolvedTag);
        continue;
      }

      for (const baseImageReference of baseImageReferences) {
        additionalImageReferences.add(`${baseImageReference}:${resolvedTag}`);
      }
    }
  }

  return Array.from(additionalImageReferences)
    .filter(
      (imageReference) =>
        !existingNormalizedReferences.has(
          normalizeImageReferenceForDeduplication(imageReference),
        ),
    )
    .map((imageReference) => `--tag ${imageReference}`);
};

const buildMetadataLabelArguments = (
  metadata: BuildExecutorOptions["metadata"],
  context: MetadataRuntimeContext,
) =>
  (metadata?.labels ?? [])
    .map((label) => interpolateTemplate(label.trim(), context))
    .filter((label) => label.length > 0)
    .map((label) => `--label ${label}`);

const runDockerBuild = (
  workspaceRoot: string,
  options: BuildExecutorOptions,
  context: MetadataRuntimeContext,
) => {
  const cwd = resolveAbsolutePath(workspaceRoot, options.cwd ?? ".");
  const envFromFile = options.envFile ? parseEnvFile(workspaceRoot, options.envFile) : {};
  const baseArgs = normalizeArgs(options.args);
  const metadataTagArguments = buildMetadataTagArguments(baseArgs, options.metadata, context);
  const metadataLabelArguments = buildMetadataLabelArguments(options.metadata, context);
  const quiet = options.quiet ?? false;
  const command = [
    "docker build .",
    ...baseArgs,
    ...metadataTagArguments,
    ...metadataLabelArguments,
  ].join(" ");

  execSync(command, {
    cwd,
    env: {
      ...process.env,
      ...envFromFile,
      ...(options.env ?? {}),
    },
    stdio: quiet ? ["ignore", "ignore", "pipe"] : "inherit",
    windowsHide: true,
  });
};

export const buildExecutor = async (
  rawOptions: unknown,
  context: BuildExecutorContext,
) => {
  const parseResult = buildExecutorSchema.safeParse(rawOptions);

  if (!parseResult.success) {
    throw new Error("Invalid Docker build executor options.", {
      cause: parseResult.error,
    });
  }

  runDockerBuild(
    context.root,
    parseResult.data,
    getRuntimeContext(context.root, context.projectName),
  );

  return { success: true };
};

export default buildExecutor;