// Registers the Docker plugins required for DX Docker target inference.
import { type Tree, updateJson } from "@nx/devkit";

interface NxJsonConfiguration {
  readonly plugins?: NxPlugin[];
}

type NxPlugin =
  | string
  | {
      readonly options?: Record<string, unknown>;
      readonly plugin: string;
    };

const dxDockerPlugin = {
  plugin: "@pagopa/nx-dx-docker-plugin",
};

const getPluginName = (plugin: NxPlugin): string =>
  typeof plugin === "string" ? plugin : plugin.plugin;

const hasPlugin = (plugins: readonly NxPlugin[], pluginName: string): boolean =>
  plugins.some((plugin) => getPluginName(plugin) === pluginName);

export default async function initGenerator(tree: Tree): Promise<void> {
  updateJson<NxJsonConfiguration>(tree, "nx.json", (nxJson) => {
    const plugins = (nxJson.plugins ?? []).filter(
      (plugin) => getPluginName(plugin) !== "@nx/docker",
    );
    if (!hasPlugin(plugins, "@pagopa/nx-dx-docker-plugin")) {
      plugins.push(dxDockerPlugin);
    }
    return { ...nxJson, plugins };
  });
}
