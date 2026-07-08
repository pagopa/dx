// Tiny shared `--key=value` CLI argument parser used by this package's
// standalone scripts (run-docker.ts, publish-docker-release.ts), which are
// invoked directly as `node <script>.js ...` from Nx target `command`
// strings rather than through Nx's own executor argument handling.
export const parseArgs = (argv: readonly string[]): Record<string, string> => {
  const args: Record<string, string> = {};
  for (const raw of argv) {
    const match = /^--([^=]+)=([\s\S]*)$/.exec(raw);
    if (match) {
      args[match[1]] = match[2];
    }
  }
  return args;
};
