let zod_v4 = require("zod/v4");
let nx_release = require("nx/release");

//#region src/release/version-actions.ts
const projectJsonSchema = zod_v4.z.object({ metadata: zod_v4.z.object({ version: zod_v4.z.string().trim().min(1) }).passthrough() }).passthrough();
/**
* Implements Nx Release for container-only projects that have no package
* manifest. The version lives in project.json metadata.version so it can be
* updated by nx release and consumed later by the publishing executor.
*/
var DockerProjectVersionActions = class extends nx_release.VersionActions {
	validManifestFilenames = ["project.json"];
	async readCurrentVersionFromRegistry() {
		return null;
	}
	async readCurrentVersionFromSourceManifest(tree) {
		const manifestPath = `${this.projectGraphNode.data.root}/project.json`;
		const content = tree.read(manifestPath, "utf-8");
		if (!content) return null;
		try {
			const parsed = projectJsonSchema.safeParse(JSON.parse(content));
			return parsed.success ? {
				currentVersion: parsed.data.metadata.version,
				manifestPath
			} : null;
		} catch {
			return null;
		}
	}
	async readCurrentVersionOfDependency() {
		return {
			currentVersion: null,
			dependencyCollection: null
		};
	}
	async updateProjectDependencies() {
		return [];
	}
	async updateProjectVersion(tree, newVersion) {
		const manifestPath = `${this.projectGraphNode.data.root}/project.json`;
		const content = tree.read(manifestPath, "utf-8");
		if (!content) throw new Error(`Failed to read ${manifestPath}`);
		let projectJson;
		try {
			projectJson = JSON.parse(content);
		} catch (cause) {
			throw new Error(`Failed to parse ${manifestPath}.`, { cause });
		}
		const parsed = projectJsonSchema.safeParse(projectJson);
		if (!parsed.success) throw new Error(`Could not read metadata.version from ${manifestPath}.`, { cause: parsed.error });
		tree.write(manifestPath, JSON.stringify({
			...parsed.data,
			metadata: {
				...parsed.data.metadata,
				version: newVersion
			}
		}, null, 2) + "\n");
		return [`Updated ${this.projectGraphNode.name} version to ${newVersion} in ${manifestPath}`];
	}
};

//#endregion
module.exports = DockerProjectVersionActions;