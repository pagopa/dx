let _nx_devkit = require("@nx/devkit");

//#region src/generators/init/generator.ts
const nxDockerPlugin = {
	plugin: "@nx/docker",
	options: {
		buildTarget: "docker:build",
		runTarget: "docker:run"
	}
};
const dxDockerPlugin = { plugin: "@pagopa/nx-dx-docker-plugin" };
const getPluginName = (plugin) => typeof plugin === "string" ? plugin : plugin.plugin;
const hasPlugin = (plugins, pluginName) => plugins.some((plugin) => getPluginName(plugin) === pluginName);
async function initGenerator(tree) {
	(0, _nx_devkit.updateJson)(tree, "nx.json", (nxJson) => {
		const plugins = [...nxJson.plugins ?? []];
		if (!hasPlugin(plugins, "@nx/docker")) plugins.push(nxDockerPlugin);
		if (!hasPlugin(plugins, "@pagopa/nx-dx-docker-plugin")) plugins.push(dxDockerPlugin);
		return {
			...nxJson,
			plugins
		};
	});
}

//#endregion
module.exports = initGenerator;