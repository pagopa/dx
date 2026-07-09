#!/usr/bin/env node
const require_docker_image = require('./docker-image-BUMKa_QH.js');
const require_github_summary = require('./github-summary-tzT8H1pT.js');
let node_child_process = require("node:child_process");
let node_fs = require("node:fs");
let node_path = require("node:path");

//#region src/publish-docker-release.ts
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
const main = () => {
	const args = require_github_summary.parseArgs(process.argv.slice(2));
	const projectRoot = args["project-root"];
	const projectName = args["project-name"];
	if (!projectRoot || !projectName) {
		console.error("[@pagopa/nx-dx-docker-plugin] --project-root and --project-name are required.");
		process.exit(1);
	}
	const versionFilePath = (0, node_path.join)(process.cwd(), "tmp", projectRoot, ".docker-version");
	if (!(0, node_fs.existsSync)(versionFilePath)) {
		console.error(`[@pagopa/nx-dx-docker-plugin] Could not find ${versionFilePath}. Did you run 'nx release version'?`);
		process.exit(1);
	}
	const fullImageRef = (0, node_fs.readFileSync)(versionFilePath, "utf8").trim();
	const { imageBase, version } = splitImageReference(fullImageRef);
	const aliasTags = require_docker_image.computeReleaseTags(projectName, version).filter((tag) => tag !== version);
	if (isDryRun()) {
		console.log(`Docker Image ${fullImageRef} was not pushed as --dry-run is enabled.`);
		for (const tag of aliasTags) console.log(`Docker Image ${imageBase}:${tag} was not tagged/pushed as --dry-run is enabled.`);
		return;
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
		require_github_summary.summarizeDockerFailure(projectName, "push", 1);
		throw err;
	}
	require_github_summary.summarizeDockerPush(projectName, imageBase, [version, ...aliasTags]);
};
main();

//#endregion