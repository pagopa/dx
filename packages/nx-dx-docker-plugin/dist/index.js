Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
const require_docker_image = require('./docker-image-DgdWlpzQ.js');
let node_child_process = require("node:child_process");
let zod_v4 = require("zod/v4");
let _nx_devkit = require("@nx/devkit");
let node_fs = require("node:fs");
let node_path = require("node:path");

//#region src/docker-build-layout.ts
const getDockerBuildOptions = (workspaceRoot, projectRoot) => {
	const packageJsonPath = (0, node_path.join)(workspaceRoot, projectRoot, "package.json");
	if ((0, node_fs.existsSync)(packageJsonPath)) return (0, _nx_devkit.readJsonFile)(packageJsonPath).nx?.docker;
	const projectJsonPath = (0, node_path.join)(workspaceRoot, projectRoot, "project.json");
	return (0, node_fs.existsSync)(projectJsonPath) ? (0, _nx_devkit.readJsonFile)(projectJsonPath).metadata?.docker : void 0;
};
const getBuildLayoutOverrides = (workspaceRoot, projectRoot) => {
	const docker = getDockerBuildOptions(workspaceRoot, projectRoot);
	return {
		contextPath: docker?.contextPath ?? ".",
		dockerfilePath: docker?.dockerfilePath ?? `${projectRoot}/Dockerfile`,
		platform: docker?.platform
	};
};

//#endregion
//#region src/docker-targets.ts
const buildDockerBuildTarget = (options) => ({
	executor: "@pagopa/nx-dx-docker-plugin:build",
	metadata: {
		description: "Build this project's Docker image locally with full OCI labels, computed fresh on every run (RFC-DX-076 feature parity with docker/metadata-action)",
		technologies: ["container-image"]
	},
	options
});
const buildDockerPushTarget = (options, buildTargetName) => ({
	dependsOn: [buildTargetName],
	executor: "@pagopa/nx-dx-docker-plugin:push",
	metadata: {
		description: "Build and push this project's Docker image with full OCI labels and index+manifest annotations; no-ops when there's nothing CI-computed to publish",
		technologies: ["container-image"]
	},
	options
});

//#endregion
//#region src/options.ts
const workspacePackageSchema = zod_v4.z.object({ name: zod_v4.z.string().min(1) });
const nxConfigurationSchema = zod_v4.z.object({
	defaultBase: zod_v4.z.string().min(1).optional(),
	release: zod_v4.z.object({ docker: zod_v4.z.object({ registryUrl: zod_v4.z.string().min(1).optional() }).optional() }).optional()
});
const pluginOptionsSchema = zod_v4.z.object({
	buildTarget: zod_v4.z.union([zod_v4.z.string().min(1), zod_v4.z.object({
		args: zod_v4.z.array(zod_v4.z.string()).optional(),
		name: zod_v4.z.string().min(1).optional()
	}).passthrough()]).optional(),
	imageAuthors: zod_v4.z.string().min(1).optional(),
	imageNamePrefix: zod_v4.z.string().min(1).optional(),
	imageUrl: zod_v4.z.string().url().optional(),
	runTarget: zod_v4.z.unknown().optional()
}).strict();
const githubRemotePattern = /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([^/]+)\/(.+?)(?:\.git)?$/;
const toRepositoryMetadata = (owner, repository) => ({
	imageNamePrefix: `${owner}/${repository}`.toLowerCase(),
	imageUrl: `https://github.com/${owner}/${repository}`
});
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
		return match ? toRepositoryMetadata(match[1], match[2]) : void 0;
	} catch {
		return;
	}
};
const deriveFromWorkspacePackage = (workspaceRoot) => {
	const parseResult = workspacePackageSchema.safeParse((0, _nx_devkit.readJsonFile)((0, node_path.join)(workspaceRoot, "package.json")));
	if (!parseResult.success) throw new Error("Unable to infer Docker repository metadata: root package.json must have a name.");
	const [scope, scopedName] = parseResult.data.name.split("/");
	return toRepositoryMetadata(scopedName ? scope.replace(/^@/, "") : "pagopa", scopedName ?? scope);
};
const getPlatform = (buildTarget) => {
	if (typeof buildTarget === "string") return "linux/amd64,linux/arm64";
	return (buildTarget?.args?.find((argument) => argument.startsWith("--platform ")))?.slice(11) ?? "linux/amd64,linux/arm64";
};
const parseDockerReleasePluginOptions = (options, workspaceRoot) => {
	const optionsResult = pluginOptionsSchema.safeParse(options ?? {});
	if (!optionsResult.success) throw new Error("Invalid @pagopa/nx-dx-docker-plugin options: only imageAuthors, imageNamePrefix, and imageUrl may be overridden.");
	const nxResult = nxConfigurationSchema.safeParse((0, _nx_devkit.readJsonFile)((0, node_path.join)(workspaceRoot, "nx.json")));
	if (!nxResult.success) throw new Error("Unable to infer Docker conventions from nx.json.");
	const repository = optionsResult.data.imageNamePrefix && optionsResult.data.imageUrl ? {
		imageNamePrefix: optionsResult.data.imageNamePrefix,
		imageUrl: optionsResult.data.imageUrl
	} : (() => {
		const inferred = deriveFromGitOrigin(workspaceRoot) ?? deriveFromWorkspacePackage(workspaceRoot);
		return {
			imageNamePrefix: optionsResult.data.imageNamePrefix ?? inferred.imageNamePrefix,
			imageUrl: optionsResult.data.imageUrl ?? inferred.imageUrl
		};
	})();
	return {
		buildTargetName: "docker:build",
		defaultBranch: nxResult.data.defaultBase ?? "main",
		imageAuthors: optionsResult.data.imageAuthors ?? "PagoPA",
		...repository,
		platform: getPlatform(optionsResult.data.buildTarget),
		pushTargetName: "docker:push",
		registry: nxResult.data.release?.docker?.registryUrl ?? "ghcr.io"
	};
};

//#endregion
//#region src/index.ts
const dockerfileGlob = "**/Dockerfile";
const getProjectJson = (workspaceRoot, projectRoot) => {
	const projectJsonPath = (0, node_path.join)(workspaceRoot, projectRoot, "project.json");
	return (0, node_fs.existsSync)(projectJsonPath) ? (0, _nx_devkit.readJsonFile)(projectJsonPath) : null;
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
	if (!(0, node_fs.existsSync)(packageJsonPath)) return getProjectJson(workspaceRoot, projectRoot)?.metadata?.docker?.repositoryName ?? null;
	const packageJson = (0, _nx_devkit.readJsonFile)(packageJsonPath);
	return packageJson.nx?.release?.docker?.repositoryName ?? packageJson.release?.docker?.repositoryName ?? null;
};
/**
* An optional `nx.docker.repositoryName` customizes only this plugin's
* `docker:build`/`docker:push` image name. Otherwise, reuse Nx Release's
* `nx.release.docker.repositoryName`, keeping one repository setting for
* projects that use both build and release flows.
*/
const getBuildImageRepositoryNameOverride = (workspaceRoot, projectRoot) => {
	const packageJsonPath = (0, node_path.join)(workspaceRoot, projectRoot, "package.json");
	if (!(0, node_fs.existsSync)(packageJsonPath)) return getProjectJson(workspaceRoot, projectRoot)?.metadata?.docker?.repositoryName ?? null;
	const packageJson = (0, _nx_devkit.readJsonFile)(packageJsonPath);
	return packageJson.nx?.docker?.repositoryName ?? packageJson.nx?.release?.docker?.repositoryName ?? packageJson.release?.docker?.repositoryName ?? null;
};
const createDockerReleaseNodes = (projectRoot, options, context) => {
	const targets = {};
	const buildLayout = getBuildLayoutOverrides(context.workspaceRoot, projectRoot);
	const projectDisplayName = require_docker_image.getProjectDisplayName(context.workspaceRoot, projectRoot);
	const imageName = require_docker_image.getImageName(options.registry, options.imageNamePrefix, projectDisplayName, getBuildImageRepositoryNameOverride(context.workspaceRoot, projectRoot) ?? void 0);
	const dockerRunOptions = {
		...buildLayout,
		defaultBranch: options.defaultBranch,
		imageAuthors: options.imageAuthors,
		imageName,
		imageUrl: options.imageUrl,
		platform: buildLayout.platform ?? options.platform,
		projectDisplayName,
		projectRoot
	};
	targets[options.buildTargetName] = buildDockerBuildTarget(dockerRunOptions);
	targets[options.pushTargetName] = buildDockerPushTarget(dockerRunOptions, options.buildTargetName);
	if (getDockerRepositoryNameOverride(context.workspaceRoot, projectRoot) !== null) targets["nx-release-publish"] = {
		executor: "@pagopa/nx-dx-docker-plugin:release-publish",
		metadata: {
			description: "Push this release's version tag plus major/major.minor/latest alias tags (RFC-DX-076 feature parity with docker/metadata-action)",
			technologies: ["container-image"]
		},
		options: { ...dockerRunOptions }
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