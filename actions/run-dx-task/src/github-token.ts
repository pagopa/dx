/** Resolves the GitHub token while preserving the action's legacy environment contract. */

export const resolveGitHubToken = (
  inputToken: string,
  environmentToken: string | undefined,
): string | undefined => inputToken || environmentToken;
