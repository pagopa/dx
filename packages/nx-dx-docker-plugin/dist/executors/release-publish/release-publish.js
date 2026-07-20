const require_docker_image = require('../../docker-image-DgdWlpzQ.js');
const require_github_summary = require('../../github-summary-cLWwWKVU.js');
let node_child_process = require("node:child_process");
let zod_v4 = require("zod/v4");
let node_fs = require("node:fs");
let node_path = require("node:path");

//#region src/executors/release-publish/schema.ts
const releasePublishExecutorSchema = zod_v4.z.object({
	projectName: zod_v4.z.string().min(1),
	projectRoot: zod_v4.z.string().min(1)
});

//#endregion
//#region src/executors/release-publish/release-publish.ts
/** Mirrors @nx/docker's own dry-run check (see version-utils.js). */
const isDryRun = () => {
	const value = process.env.NX_DRY_RUN;
	return Boolean(value) && value !== "false";
};
const splitImageReference = (fullImageRef) => {
	const separatorIndex = fullImageRef.lastIndexOf(":");
	return {
		imageBase: fullImageRef.slice(0, separatorIndex),
		version: fullImageRef.slice(separatorIndex + 1)
	};
};
const getExitCode = (error) => {
	if (typeof error === "object" && error !== null && "status" in error && typeof error.status === "number") return error.status;
	return 1;
};
const runExecutor = async (options, context) => {
	const parseResult = releasePublishExecutorSchema.safeParse(options);
	if (!parseResult.success) {
		console.warn("[@pagopa/nx-dx-docker-plugin] Invalid nx-release-publish options:", parseResult.error.issues);
		return { success: false };
	}
	const { projectName, projectRoot } = parseResult.data;
	const versionFilePath = (0, node_path.join)(context.root, "tmp", projectRoot, ".docker-version");
	if (!(0, node_fs.existsSync)(versionFilePath)) {
		console.error(`[@pagopa/nx-dx-docker-plugin] Could not find ${versionFilePath}. Did you run 'nx release version'?`);
		return { success: false };
	}
	const fullImageRef = (0, node_fs.readFileSync)(versionFilePath, "utf8").trim();
	const { imageBase, version } = splitImageReference(fullImageRef);
	const aliasTags = require_docker_image.computeReleaseTags(projectName, version).filter((tag) => tag !== version);
	if (isDryRun()) {
		console.log(`Docker Image ${fullImageRef} was not pushed as --dry-run is enabled.`);
		for (const tag of aliasTags) console.log(`Docker Image ${imageBase}:${tag} was not tagged/pushed as --dry-run is enabled.`);
		return { success: true };
	}
	try {
		(0, node_child_process.execFileSync)("docker", ["push", fullImageRef], { stdio: "inherit" });
		console.log(`Successfully pushed ${fullImageRef}`);
		for (const tag of aliasTags) {
			const aliasRef = `${imageBase}:${tag}`;
			(0, node_child_process.execFileSync)("docker", [
				"tag",
				fullImageRef,
				aliasRef
			], { stdio: "inherit" });
			(0, node_child_process.execFileSync)("docker", ["push", aliasRef], { stdio: "inherit" });
			console.log(`Successfully pushed ${aliasRef}`);
		}
	} catch (err) {
		require_github_summary.summarizeDockerFailure(projectName, "push", getExitCode(err));
		console.error("[@pagopa/nx-dx-docker-plugin] Docker push failed:", err);
		return { success: false };
	}
	require_github_summary.summarizeDockerPush(projectName, imageBase, [version, ...aliasTags]);
	return { success: true };
};

//#endregion
module.exports = runExecutor;