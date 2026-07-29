let _nx_devkit = require("@nx/devkit");

//#region src/generators/init/generator.ts
const dxDockerPlugin = { plugin: "@pagopa/nx-dx-docker-plugin" };
const getPluginName = (plugin) => typeof plugin === "string" ? plugin : plugin.plugin;
const hasPlugin = (plugins, pluginName) => plugins.some((plugin) => getPluginName(plugin) === pluginName);
async function initGenerator(tree) {
	(0, _nx_devkit.updateJson)(tree, "nx.json", (nxJson) => {
		const plugins = (nxJson.plugins ?? []).filter((plugin) => getPluginName(plugin) !== "@nx/docker");
		if (!hasPlugin(plugins, "@pagopa/nx-dx-docker-plugin")) plugins.push(dxDockerPlugin);
		return {
			...nxJson,
			plugins
		};
	});
}

//#endregion
module.exports = initGenerator;