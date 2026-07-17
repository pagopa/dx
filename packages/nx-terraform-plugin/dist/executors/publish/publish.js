import { n as getPackageLogger, t as configureLogger } from "../../logger-DZ1KFLzv.js";
import { i as publishSchema } from "../../publish-options-DI4KrjU0.js";
import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { Octokit } from "octokit";
import { tmpdir } from "node:os";
import { z } from "zod/v4";
import { $ } from "execa";
import { createAppAuth } from "@octokit/auth-app";

//#region src/adapters/github/octokit.ts
const createGitHubAppToken = async (owner, credentials) => {
	const installation = await new Octokit({
		auth: {
			appId: credentials.clientId,
			privateKey: credentials.privateKey
		},
		authStrategy: createAppAuth
	}).rest.apps.getOrgInstallation({ org: owner });
	return (await createAppAuth({
		appId: credentials.clientId,
		installationId: installation.data.id,
		privateKey: credentials.privateKey
	})({
		permissions: { contents: "write" },
		type: "installation"
	})).token;
};
const revokeGitHubAppToken = async (token) => {
	await new Octokit({ auth: token }).rest.apps.revokeInstallationAccessToken();
};
const getAuthenticatedUserLogin = async (octokit, owner) => {
	try {
		return (await octokit.rest.users.getAuthenticated()).data.login;
	} catch (error) {
		throw new Error(`Cannot create repository for user owner "${owner}" without user-scoped GitHub credentials. GitHub App installation tokens can create organization repositories, but not user-owned repositories.`, { cause: error });
	}
};
const ensureGitHubRepository = async (owner, repo, token) => {
	const octokit = new Octokit({ auth: token });
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
	const token = input.githubAppCredentials === void 0 ? input.githubToken : await createGitHubAppToken(input.githubOwner, input.githubAppCredentials);
	let publishError;
	let publishResult = "published";
	let tempExportDir;
	try {
		await ensureGitHubRepository(input.githubOwner, repo, token);
		tempExportDir = await mkdtemp(join(tmpdir(), "export-repo-"));
		await copyModuleDirectoryContents(sourceModuleDirectory, tempExportDir);
		const $$1 = $({
			cwd: tempExportDir,
			env: {
				GH_TOKEN: token,
				GIT_AUTHOR_EMAIL: "pagopa-dx-bot@pagopa.it",
				GIT_AUTHOR_NAME: "PagoPA DX Bot",
				GIT_COMMITTER_EMAIL: "pagopa-dx-bot@pagopa.it",
				GIT_COMMITTER_NAME: "PagoPA DX Bot"
			},
			shell: true
		});
		const safe$ = $$1({ reject: false });
		await $$1`git init -b main`;
		await $$1`gh auth setup-git`;
		if ((await safe$`git remote add origin ${repoUrl}`).exitCode !== 0) throw new Error(`Failed to add git remote origin for ${repoUrl}`);
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
			const commitResult = await safe$`git commit -m "Release ${input.version}"`;
			if (commitResult.exitCode !== 0) {
				const commitOutput = `${commitResult.stdout}${commitResult.stderr}`;
				if (!commitOutput.includes("nothing to commit")) throw new Error(`Failed to commit release ${input.version} for ${repoUrl}: ${commitOutput}`);
			}
			await $$1`git tag -f ${input.version}`;
			await $$1`git push origin main`;
			await $$1`git push origin refs/tags/${input.version} --force`;
		}
	} catch (error) {
		publishError = error;
	}
	let cleanupError;
	if (tempExportDir !== void 0) try {
		await rm(tempExportDir, {
			force: true,
			recursive: true
		});
	} catch (error) {
		const cleanupMessage = `Failed to remove temporary export directory ${tempExportDir}: ${error instanceof Error ? error.message : String(error)}`;
		cleanupError = new Error(cleanupMessage, { cause: error });
	}
	let revokeError;
	if (input.githubAppCredentials !== void 0) try {
		await revokeGitHubAppToken(token);
	} catch (error) {
		revokeError = error;
	}
	const finalError = publishError ?? cleanupError ?? revokeError;
	if (finalError !== void 0) throw finalError;
	return publishResult;
};

//#endregion
//#region src/executors/publish/schema.ts
const githubAppEnvironmentSchema = z.object({
	GH_APP_CLIENT_ID: z.string().min(1),
	GH_APP_KEY: z.string().min(1).transform((privateKey) => privateKey.replaceAll("\\n", "\n"))
});
const githubTokenEnvironmentSchema = z.object({
	GH_TOKEN: z.string().min(1).optional(),
	GITHUB_TOKEN: z.string().min(1).optional()
}).transform((environment, context) => {
	const token = environment.GH_TOKEN ?? environment.GITHUB_TOKEN;
	if (token === void 0) {
		context.addIssue({
			code: "custom",
			message: "GH_TOKEN or GITHUB_TOKEN is required",
			path: ["GH_TOKEN"]
		});
		return z.NEVER;
	}
	return token;
});
const nxReleasePublishExecutorSchema = z.object({
	description: publishSchema.shape.description,
	githubOwner: publishSchema.shape.github.shape.owner,
	projectRoot: z.string().min(1),
	provider: publishSchema.shape.provider,
	useGitHubAppAuthentication: z.boolean().default(false),
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
	let githubAppCredentials;
	let githubToken;
	if (validatedOptions.useGitHubAppAuthentication) {
		const environmentParseResult = githubAppEnvironmentSchema.safeParse(process.env);
		if (!environmentParseResult.success) {
			logger.warn("Invalid GitHub authentication environment", {
				issues: environmentParseResult.error.issues,
				path: validatedOptions.projectRoot
			});
			return { success: false };
		}
		githubAppCredentials = {
			clientId: environmentParseResult.data.GH_APP_CLIENT_ID,
			privateKey: environmentParseResult.data.GH_APP_KEY
		};
		githubToken = "";
	} else {
		const environmentParseResult = githubTokenEnvironmentSchema.safeParse(process.env);
		if (!environmentParseResult.success) {
			logger.warn("Invalid GitHub authentication environment", {
				issues: environmentParseResult.error.issues,
				path: validatedOptions.projectRoot
			});
			return { success: false };
		}
		githubToken = environmentParseResult.data;
	}
	const repoName = getRepoNameFromProjectRoot(validatedOptions.projectRoot, validatedOptions.provider);
	logger.info("Publishing Terraform module from {projectRoot} to repository {repoName}...", {
		projectRoot: validatedOptions.projectRoot,
		repoName
	});
	if (await publishToGithub({
		description: validatedOptions.description,
		githubAppCredentials,
		githubOwner: validatedOptions.githubOwner,
		githubToken,
		projectRoot: validatedOptions.projectRoot,
		provider: validatedOptions.provider,
		version: validatedOptions.version,
		workspaceRoot: validatedOptions.workspaceRoot
	}) === "skipped") logger.info("Skipping release, tag already exists");
	return { success: true };
};

//#endregion
export { runExecutor as default, getRepoNameFromProjectRoot };