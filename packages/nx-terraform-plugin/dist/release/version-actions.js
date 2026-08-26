import { VersionActions } from "nx/release";

//#region src/release/version-actions.ts
/**
* Custom Nx Release VersionActions implementation for Terraform modules.
*
* This class manages versioning of publishable Terraform modules by reading
* and writing the `version` field in module.json files.
*
* Key behaviors:
* - Reads current version from module.json (disk-based resolution)
* - Updates version in module.json during release
* - Does NOT support registry-based version resolution
* - Does NOT manage module dependencies (explicit no-op)
*
* Used via project-level
* `release.version.versionActions: "@pagopa/nx-terraform-plugin/release/version-actions"`
* in inferred Terraform project configuration.
*/
var TerraformVersionActions = class extends VersionActions {
	validManifestFilenames = ["module.json"];
	/**
	* Registry-based version resolution is not supported for Terraform modules.
	*
	* Terraform modules published to GitHub do not have a traditional registry
	* with queryable version metadata, so we always return null here.
	*
	* Users should configure `currentVersionResolver: "disk"` or `"git-tag"`
	* for Terraform projects.
	*
	* @returns null (not supported)
	*/
	async readCurrentVersionFromRegistry(_tree, _currentVersionResolverMetadata) {
		return null;
	}
	/**
	* Reads the current version from the module.json manifest file.
	*
	* Returns null if:
	* - The module.json file does not exist
	* - The file is invalid JSON
	* - The version field is missing or not a string
	*
	* @param tree - The virtual file system tree
	* @returns An object with the current version and manifest path, or null
	*/
	async readCurrentVersionFromSourceManifest(tree) {
		const manifestPath = `${this.projectGraphNode.data.root}/module.json`;
		if (!tree.exists(manifestPath)) return null;
		try {
			const content = tree.read(manifestPath, "utf-8");
			if (!content) return null;
			const manifest = JSON.parse(content);
			if (typeof manifest.version !== "string") return null;
			return {
				currentVersion: manifest.version,
				manifestPath
			};
		} catch {
			return null;
		}
	}
	/**
	* Reads the current version of a dependency.
	*
	* For Terraform modules, dependencies are not versioned in the manifest,
	* so we always return null for both currentVersion and dependencyCollection.
	*
	* @returns null for both currentVersion and dependencyCollection
	*/
	async readCurrentVersionOfDependency(_tree, _projectGraph, _dependencyProjectName) {
		return {
			currentVersion: null,
			dependencyCollection: null
		};
	}
	/**
	* Explicit no-op for dependency updates.
	*
	* Terraform modules do not manage versioned dependencies in module.json,
	* so this method intentionally does nothing and returns an empty array.
	*
	* Dependencies in Terraform are specified via source references in .tf files,
	* which are not managed by Nx Release.
	*
	* @returns An empty array (no updates performed)
	*/
	async updateProjectDependencies(_tree, _projectGraph, _dependenciesToUpdate) {
		return [];
	}
	/**
	* Updates the version field in the module.json file.
	*
	* Preserves:
	* - Field order in the JSON object
	* - JSON formatting (indentation)
	* - Other fields in the manifest
	*
	* @param tree - The virtual file system tree
	* @param newVersion - The new semantic version to write
	* @returns An array with a single log message describing the update
	*/
	async updateProjectVersion(tree, newVersion) {
		const manifestPath = `${this.projectGraphNode.data.root}/module.json`;
		const content = tree.read(manifestPath, "utf-8");
		if (!content) throw new Error(`Failed to read ${manifestPath}`);
		let manifest;
		try {
			manifest = JSON.parse(content);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to parse ${manifestPath}: ${message}`, { cause: error });
		}
		manifest.version = newVersion;
		tree.write(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
		return [`Updated ${this.projectGraphNode.name} version to ${newVersion} in ${manifestPath}`];
	}
};

//#endregion
export { TerraformVersionActions as default };