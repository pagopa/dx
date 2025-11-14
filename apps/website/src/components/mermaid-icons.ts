import { icons } from "@iconify-json/logos";
import mermaid from "mermaid";
mermaid.registerIconPacks([
  {
    icons,
    name: icons.prefix, // To use the prefix defined in the icon pack
  },
]);
