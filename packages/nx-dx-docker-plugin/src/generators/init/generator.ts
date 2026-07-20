// Registers the Docker plugins required for DX Docker target inference.
import { type Tree, updateJson } from "@nx/devkit";

interface NxPluginConfiguration {
  readonly options?: Record<string, unknown>;
  readonly plugin: string;
}

type NxPlugin = NxPluginConfiguration | string;

interface NxJsonConfiguration {
  readonly plugins?: NxPlugin[];
}

const nxDockerPlugin: NxPluginConfiguration = {
  plugin: "@nx/docker",
  options: {
    buildTarget: "docker:build",
    runTarget: "docker:run",
  },
};

const dxDockerPlugin: NxPluginConfiguration = {
  plugin: "@pagopa/nx-dx-docker-plugin",
};

const getPluginName = (plugin: NxPlugin): string =>
  typeof plugin === "string" ? plugin : plugin.plugin;

const hasPlugin = (plugins: readonly NxPlugin[], pluginName: string): boolean =>
  plugins.some((plugin) => getPluginName(plugin) === pluginName);

export default async function initGenerator(tree: Tree): Promise<void> {
  updateJson<NxJsonConfiguration>(tree, "nx.json", (nxJson) => {
    const plugins = [...(nxJson.plugins ?? [])];
    if (!hasPlugin(plugins, "@nx/docker")) {
      plugins.push(nxDockerPlugin);
    }
    if (!hasPlugin(plugins, "@pagopa/nx-dx-docker-plugin")) {
      plugins.push(dxDockerPlugin);
    }
    return { ...nxJson, plugins };
  });
}