import { n as getPackageLogger, t as configureLogger } from "../../logger-DZ1KFLzv.js";
import { i as publishSchema } from "../../publish-options-DI4KrjU0.js";
import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { Octokit } from "octokit";
import { z } from "zod/v4";
import { $ } from "execa";
import { tmpdir } from "node:os";

//#region src/adapters/github/octokit.ts
const getGitHubToken = () => process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
const getAuthenticatedUserLogin = async (octokit, owner) => {
	try {
		return (await octokit.rest.users.getAuthenticated()).data.login;
	} catch (error) {
		throw new Error(`Cannot create repository for user owner "${owner}" without user-scoped GitHub credentials. GitHub App installation tokens can create organization repositories, but not user-owned repositories.`, { cause: error });
	}
};
const ensureGitHubRepository = async (owner, repo) => {
	const octokit = new Octokit({ auth: getGitHubToken() });
	try {
		await octokit.rest.repos.get({
			owner,
			repo
		});
		return;
	} catch (error) {
		if (!(error instanceof Error) || !("status" in error) || error.status !== 404) throw error;
	}
	if ((await octokit.rest.users.getByUsername({ username: owner })).data.type === "Organization") {
		await octokit.rest.repos.createInOrg({
			name: repo,
			org: owner,
			visibility: "public"
		});
		return;
	}
	const authenticatedUserLogin = await getAuthenticatedUserLogin(octokit, owner);
	if (authenticatedUserLogin !== owner) throw new Error(`Cannot create repository for user owner "${owner}" with authenticated user "${authenticatedUserLogin}".`);
	await octokit.rest.repos.createForAuthenticatedUser({
		name: repo,
		visibility: "public"
	});
};

//#endregion
//#region src/adapters/github/publisher.ts
const getRepoNameFromProjectRoot = (projectRoot, provider) => {
	return `terraform-${provider}-${basename(projectRoot.replace(/\\/g, "/")).replaceAll("_", "-")}`;
};
const copyModuleDirectoryContents = async (sourceDirectory, targetDirectory) => {
	await cp(sourceDirectory, targetDirectory, {
		filter: (source) => {
			return !source.replace(/\\/g, "/").split("/").includes(".git");
		},
		recursive: true
	});
};
const clearExportWorkingTree = async (exportDirectory) => {
	const entries = await readdir(exportDirectory, { withFileTypes: true });
	await Promise.all(entries.filter((entry) => entry.name !== ".git").map((entry) => rm(join(exportDirectory, entry.name), {
		force: true,
		recursive: true
	})));
};
const publishToGithub = async (input) => {
	const repo = getRepoNameFromProjectRoot(input.projectRoot, input.provider);
	const repoUrl = `https://github.com/${input.githubOwner}/${repo}.git`;
	const sourceModuleDirectory = join(input.workspaceRoot, input.projectRoot);
	await ensureGitHubRepository(input.githubOwner, repo);
	let publishError;
	let publishResult = "published";
	let tempExportDir;
	try {
		tempExportDir = await mkdtemp(join(tmpdir(), "export-repo-"));
		await copyModuleDirectoryContents(sourceModuleDirectory, tempExportDir);
		const $$1 = $({
			cwd: tempExportDir,
			env: {
				GIT_AUTHOR_EMAIL: "pagopa-dx-bot@pagopa.it",
				GIT_AUTHOR_NAME: "PagoPA DX Bot",
				GIT_COMMITTER_EMAIL: "pagopa-dx-bot@pagopa.it",
				GIT_COMMITTER_NAME: "PagoPA DX Bot"
			},
			shell: true
		});
		const safe$ = $$1({ reject: false });
		await $$1`git init -b main`;
		await $$1`git remote add origin ${repoUrl}`;
		const remoteTag = await safe$`git ls-remote --exit-code --tags origin refs/tags/${input.version}`;
		if (remoteTag.exitCode === 0) publishResult = "skipped";
		else if (remoteTag.exitCode !== 2) throw new Error(`Failed to resolve remote tag ${input.version} for ${repoUrl}`);
		else {
			await clearExportWorkingTree(tempExportDir);
			const remoteMain = await safe$`git ls-remote --exit-code --heads origin main`;
			if (remoteMain.exitCode === 0) {
				await $$1`git fetch origin main`;
				await $$1`git checkout -B main origin/main`;
			} else if (remoteMain.exitCode !== 2) throw new Error(`Failed to resolve remote main for ${repoUrl}`);
			await clearExportWorkingTree(tempExportDir);
			await copyModuleDirectoryContents(sourceModuleDirectory, tempExportDir);
			await $$1`git add --all`;
			await $$1`git commit -m "Release ${input.version}"`;
			await $$1`git tag -f ${input.version}`;
			await $$1`git push origin main`;
			await $$1`git push origin refs/tags/${input.version} --force`;
		}
	} catch (error) {
		publishError = error;
	}
	if (tempExportDir !== void 0) try {
		await rm(tempExportDir, {
			force: true,
			recursive: true
		});
	} catch (cleanupError) {
		if (publishError !== void 0) throw publishError;
		const cleanupMessage = `Failed to remove temporary export directory ${tempExportDir}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`;
		throw new Error(cleanupMessage, { cause: cleanupError });
	}
	if (publishError !== void 0) throw publishError;
	return publishResult;
};

//#endregion
//#region src/executors/publish/schema.ts
const nxReleasePublishExecutorSchema = z.object({
	description: publishSchema.shape.description,
	githubOwner: publishSchema.shape.github.shape.owner,
	projectRoot: z.string().min(1),
	provider: publishSchema.shape.provider,
	version: publishSchema.shape.version,
	workspaceRoot: z.string()
});

//#endregion
//#region src/executors/publish/publish.ts
const runExecutor = async (options) => {
	const logger = getPackageLogger(["publish"]);
	const parseResult = nxReleasePublishExecutorSchema.safeParse(options);
	await configureLogger();
	if (!parseResult.success) {
		logger.warn("Invalid publish options", {
			issues: parseResult.error.issues,
			path: options.projectRoot ?? "publish options"
		});
		return { success: false };
	}
	const validatedOptions = parseResult.data;
	const repoName = getRepoNameFromProjectRoot(validatedOptions.projectRoot, validatedOptions.provider);
	logger.info("Publishing Terraform module from {projectRoot} to repository {repoName}...", {
		projectRoot: validatedOptions.projectRoot,
		repoName
	});
	if (await publishToGithub({
		description: validatedOptions.description,
		githubOwner: validatedOptions.githubOwner,
		projectRoot: validatedOptions.projectRoot,
		provider: validatedOptions.provider,
		version: validatedOptions.version,
		workspaceRoot: validatedOptions.workspaceRoot
	}) === "skipped") logger.info("Skipping release, tag already exists");
	return { success: true };
};

//#endregion
export { runExecutor as default, getRepoNameFromProjectRoot };