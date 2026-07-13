Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
const require_docker_image = require('./docker-image-D-GedRN7.js');
let node_child_process = require("node:child_process");
let zod_v4 = require("zod/v4");
let _nx_devkit = require("@nx/devkit");
let node_fs = require("node:fs");
let node_path = require("node:path");

//#region src/docker-targets.ts
const buildDockerBuildTarget = (options) => ({
	executor: "@pagopa/nx-dx-docker-plugin:build",
	metadata: {
		description: "Build this project's Docker image locally with full OCI labels, computed fresh on every run (RFC-DX-076 feature parity with docker/metadata-action)",
		technologies: ["docker"]
	},
	options
});
const buildDockerPushTarget = (options, buildTargetName) => ({
	dependsOn: [buildTargetName],
	executor: "@pagopa/nx-dx-docker-plugin:push",
	metadata: {
		description: "Build and push this project's Docker image with full OCI labels and index+manifest annotations; no-ops when there's nothing CI-computed to publish",
		technologies: ["docker"]
	},
	options
});

//#endregion
//#region src/options.ts
const nonEmptyString = zod_v4.z.string().min(1);
const dockerPluginOptionsSchema = zod_v4.z.object({
	buildTargetName: nonEmptyString,
	defaultBranch: nonEmptyString,
	imageAuthors: nonEmptyString,
	imageNamePrefix: nonEmptyString,
	imageUrl: nonEmptyString,
	jsBuildTargetName: nonEmptyString,
	packageTargetName: nonEmptyString,
	platform: nonEmptyString,
	pushTargetName: nonEmptyString,
	registry: nonEmptyString
});
const defaultOptions = {
	buildTargetName: "docker:build",
	defaultBranch: "main",
	jsBuildTargetName: "build",
	packageTargetName: "package",
	platform: "linux/amd64,linux/arm64",
	pushTargetName: "docker:push",
	registry: "ghcr.io"
};
const partialSchema = dockerPluginOptionsSchema.partial({
	buildTargetName: true,
	defaultBranch: true,
	imageNamePrefix: true,
	imageUrl: true,
	jsBuildTargetName: true,
	packageTargetName: true,
	platform: true,
	pushTargetName: true,
	registry: true
});
const githubRemotePattern = /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([^/]+)\/(.+?)(?:\.git)?$/;
const deriveFromGitOrigin = (workspaceRoot) => {
	try {
		const remoteUrl = (0, node_child_process.execFileSync)("git", [
			"remote",
			"get-url",
			"origin"
		], {
			cwd: workspaceRoot,
			encoding: "utf8"
		}).trim();
		const match = githubRemotePattern.exec(remoteUrl);
		if (!match) return void 0;
		const [, owner, repo] = match;
		return {
			imageNamePrefix: `${owner}/${repo}`.toLowerCase(),
			imageUrl: `https://github.com/${owner}/${repo}`
		};
	} catch {
		return;
	}
};
const parseDockerReleasePluginOptions = (options, workspaceRoot) => {
	const input = typeof options === "object" && options !== null ? options : {};
	const parseResult = partialSchema.safeParse(input);
	if (!parseResult.success) {
		const validationErrors = parseResult.error.issues.map((issue) => {
			return `${issue.path.length > 0 ? issue.path.join(".") : "options"}: ${issue.message}`;
		}).join("; ");
		throw new Error(`Invalid @pagopa/nx-dx-docker-plugin options: ${validationErrors}`);
	}
	const parsed = parseResult.data;
	const gitOrigin = parsed.imageNamePrefix === void 0 || parsed.imageUrl === void 0 ? deriveFromGitOrigin(workspaceRoot) : void 0;
	const imageNamePrefix = parsed.imageNamePrefix ?? gitOrigin?.imageNamePrefix;
	const imageUrl = parsed.imageUrl ?? gitOrigin?.imageUrl;
	if (imageNamePrefix === void 0 || imageUrl === void 0) throw new Error("Invalid @pagopa/nx-dx-docker-plugin options: imageNamePrefix/imageUrl were not set and could not be auto-detected from the git 'origin' remote (missing git repo, missing origin, or a non-github.com remote) — set them explicitly in this plugin's nx.json options.");
	return {
		...defaultOptions,
		...parsed,
		imageNamePrefix,
		imageUrl
	};
};

//#endregion
//#region src/package-target.ts
const buildPackageTarget = (projectRoot, projectName, jsBuildTargetName) => ({
	command: `rm -rf ${projectRoot}/deploy && pnpm --filter ${projectName} deploy --legacy --prod ${projectRoot}/deploy`,
	dependsOn: [jsBuildTargetName],
	metadata: {
		description: "Materialize the production-only payload consumed by this project's Dockerfile (RFC-DX-076)",
		technologies: ["docker"]
	}
});

//#endregion
//#region src/index.ts
const dockerfileGlob = "**/Dockerfile";
/**
* A project is eligible for the generated `package` target only if it
* already produces a JS/TS build output through Nx. This repo's convention
* for that is either an explicit target in `project.json`, or an inferred
* `build` target via `@nx/js/typescript` (signaled by a `tsconfig.lib.json`).
*/
const hasJsBuildTarget = (workspaceRoot, projectRoot, jsBuildTargetName) => {
	const projectJsonPath = (0, node_path.join)(workspaceRoot, projectRoot, "project.json");
	if ((0, node_fs.existsSync)(projectJsonPath)) {
		if ((0, _nx_devkit.readJsonFile)(projectJsonPath).targets?.[jsBuildTargetName]) return true;
	}
	const packageJsonPath = (0, node_path.join)(workspaceRoot, projectRoot, "package.json");
	const tsconfigLibPath = (0, node_path.join)(workspaceRoot, projectRoot, "tsconfig.lib.json");
	return (0, node_fs.existsSync)(packageJsonPath) && (0, node_fs.existsSync)(tsconfigLibPath);
};
const getProjectName = (workspaceRoot, projectRoot) => {
	const packageJson = (0, _nx_devkit.readJsonFile)((0, node_path.join)(workspaceRoot, projectRoot, "package.json"));
	if (!packageJson.name) throw new Error(`Unable to resolve a package name for project at ${projectRoot}; a package.json with a "name" field is required to build the "package" target.`);
	return packageJson.name;
};
/**
* Detects the *official* Nx Docker release flow's per-project override
* (`nx.release.docker.repositoryName` in package.json). Projects using it
* get their `nx-release-publish` target overridden to also push the
* dynamic alias tags (see executors/release-publish), since
* `@nx/docker:release-publish` on its own only ever pushes a single
* version-only tag.
*/
const getDockerRepositoryNameOverride = (workspaceRoot, projectRoot) => {
	const packageJsonPath = (0, node_path.join)(workspaceRoot, projectRoot, "package.json");
	if (!(0, node_fs.existsSync)(packageJsonPath)) return null;
	return (0, _nx_devkit.readJsonFile)(packageJsonPath).nx?.release?.docker?.repositoryName ?? null;
};
/**
* An optional `nx.docker.repositoryName` customizes only this plugin's
* `docker:build`/`docker:push` image name. Otherwise, reuse Nx Release's
* `nx.release.docker.repositoryName`, keeping one repository setting for
* projects that use both build and release flows.
*/
const getBuildImageRepositoryNameOverride = (workspaceRoot, projectRoot) => {
	const packageJsonPath = (0, node_path.join)(workspaceRoot, projectRoot, "package.json");
	if (!(0, node_fs.existsSync)(packageJsonPath)) return null;
	const packageJson = (0, _nx_devkit.readJsonFile)(packageJsonPath);
	return packageJson.nx?.docker?.repositoryName ?? packageJson.nx?.release?.docker?.repositoryName ?? null;
};
/**
* Resolves the project-level Docker build layout. Both values are relative
* to the workspace root because executors always run Docker from
* `context.root`; this keeps Docker COPY paths deterministic in monorepos.
*/
const getBuildLayoutOverrides = (workspaceRoot, projectRoot) => {
	const packageJsonPath = (0, node_path.join)(workspaceRoot, projectRoot, "package.json");
	if (!(0, node_fs.existsSync)(packageJsonPath)) return {
		contextPath: ".",
		dockerfilePath: `${projectRoot}/Dockerfile`
	};
	const packageJson = (0, _nx_devkit.readJsonFile)(packageJsonPath);
	return {
		contextPath: packageJson.nx?.docker?.contextPath ?? ".",
		dockerfilePath: packageJson.nx?.docker?.dockerfilePath ?? `${projectRoot}/Dockerfile`
	};
};
const createDockerReleaseNodes = (projectRoot, options, context) => {
	const targets = {};
	if (hasJsBuildTarget(context.workspaceRoot, projectRoot, options.jsBuildTargetName)) {
		const projectName = getProjectName(context.workspaceRoot, projectRoot);
		targets[options.packageTargetName] = buildPackageTarget(projectRoot, projectName, options.jsBuildTargetName);
	}
	const projectDisplayName = require_docker_image.getProjectDisplayName(context.workspaceRoot, projectRoot);
	const imageName = require_docker_image.getImageName(options.registry, options.imageNamePrefix, projectDisplayName, getBuildImageRepositoryNameOverride(context.workspaceRoot, projectRoot) ?? void 0);
	const dockerRunOptions = {
		...getBuildLayoutOverrides(context.workspaceRoot, projectRoot),
		defaultBranch: options.defaultBranch,
		imageAuthors: options.imageAuthors,
		imageName,
		imageUrl: options.imageUrl,
		platform: options.platform,
		projectDisplayName,
		projectRoot
	};
	targets[options.buildTargetName] = buildDockerBuildTarget(dockerRunOptions);
	targets[options.pushTargetName] = buildDockerPushTarget(dockerRunOptions, options.buildTargetName);
	if (getDockerRepositoryNameOverride(context.workspaceRoot, projectRoot) !== null) targets["nx-release-publish"] = {
		executor: "@pagopa/nx-dx-docker-plugin:release-publish",
		metadata: {
			description: "Push this release's version tag plus major/major.minor/latest alias tags (RFC-DX-076 feature parity with docker/metadata-action)",
			technologies: ["docker"]
		},
		options: {
			projectName: projectDisplayName,
			projectRoot
		}
	};
	return { projects: { [projectRoot]: {
		root: projectRoot,
		targets
	} } };
};
const createNodesV2 = [dockerfileGlob, async (configFilePaths, options, context) => {
	const parsedOptions = parseDockerReleasePluginOptions(options, context.workspaceRoot);
	return (0, _nx_devkit.createNodesFromFiles)((configFilePath, _options, nodeContext) => createDockerReleaseNodes((0, node_path.dirname)(configFilePath), parsedOptions, nodeContext), configFilePaths, options, context);
}];

//#endregion
exports.createDockerReleaseNodes = createDockerReleaseNodes;
exports.createNodesV2 = createNodesV2;
exports.getProjectName = getProjectName;
exports.hasJsBuildTarget = hasJsBuildTarget;