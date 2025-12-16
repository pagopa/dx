import { $ } from "execa";

/**
 * A pre-configured execa instance for running git commands in a shell.
 *
 * @example
 * await git$`git status`;
 * await git$({ cwd: '/path/to/repo' })`git pull`;
 */
export const git$ = $({
  shell: true,
});
