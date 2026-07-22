Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: 'Module' } });
const require_docker_image = require('../../docker-image-DgdWlpzQ.js');
const require_docker_run = require('../../docker-run-DDA4SJic.js');
let zod_v4 = require("zod/v4");
let node_path = require("node:path");
let node_fs_promises = require("node:fs/promises");

//#region src/executors/release-publish/schema.ts
const releasePublishSchema = require_docker_run.dockerRunOptionsSchema.extend({ dryRun: zod_v4.z.boolean().optional() });

//#endregion
//#region src/executors/release-publish/release-publish.ts
/** Publishes a release Docker image directly from the released package version. */
const packageJsonSchema = zod_v4.z.object({ version: zod_v4.z.string().trim().min(1) });
const projectJsonSchema = zod_v4.z.object({ metadata: zod_v4.z.object({ version: zod_v4.z.string().trim().min(1) }) });
const readJson = async (filePath) => {
	const content = await (0, node_fs_promises.readFile)(filePath, "utf8");
	try {
		return JSON.parse(content);
	} catch (cause) {
		throw new Error(`Could not parse ${filePath}.`, { cause });
	}
};
const isFileNotFound = (error) => error instanceof Error && "code" in error && error.code === "ENOENT";
const readReleasedVersion = async (workspaceRoot, projectRoot) => {
	const packageJsonPath = (0, node_path.join)(workspaceRoot, projectRoot, "package.json");
	try {
		const parseResult = packageJsonSchema.safeParse(await readJson(packageJsonPath));
		if (!parseResult.success) throw new Error(`Could not read a version from ${packageJsonPath}.`, { cause: parseResult.error });
		return {
			sourcePath: `${projectRoot}/package.json`,
			version: parseResult.data.version
		};
	} catch (error) {
		if (!isFileNotFound(error)) throw error;
	}
	const projectJsonPath = (0, node_path.join)(workspaceRoot, projectRoot, "project.json");
	const parseResult = projectJsonSchema.safeParse(await readJson(projectJsonPath));
	if (!parseResult.success) throw new Error(`Could not read a version from ${projectJsonPath} metadata.version.`, { cause: parseResult.error });
	return {
		sourcePath: `${projectRoot}/project.json`,
		version: parseResult.data.metadata.version
	};
};
const releasePublishExecutor = async (rawOptions, context) => {
	const parseResult = releasePublishSchema.safeParse(rawOptions);
	if (!parseResult.success) throw new Error("Invalid Docker publish executor options.", { cause: parseResult.error });
	const options = parseResult.data;
	const release = await readReleasedVersion(context.root, options.projectRoot);
	const releaseTags = require_docker_image.computeReleaseTags(options.projectDisplayName, release.version);
	if (releaseTags.length === 0) throw new Error(`Version '${release.version}' in ${release.sourcePath} is not Docker-compatible semantic version.`);
	if (process.env.NX_DRY_RUN === "true" || options.dryRun === true) {
		console.info(`Dry run enabled: would build and push '${options.imageName}' with tags ${releaseTags.join(", ")}.`);
		return { success: true };
	}
	return require_docker_run.runDockerCommand("push", options, context.root, release.version);
};

//#endregion
exports.default = releasePublishExecutor;
exports.releasePublishExecutor = releasePublishExecutor;