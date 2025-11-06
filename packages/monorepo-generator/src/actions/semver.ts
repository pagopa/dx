import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { SemVer } from "semver";

export type FetchSemverFn = () => ResultAsync<null | SemVer, Error>;

/**
 * Fetches the latest semantic version using the provided fetch function and writes
 * a formatted version string into the given `answers` object under `answerKey`.
 *
 * @param fetchSemverFn - A zero-arg function that returns a `ResultAsync` resolving
 *   to a `SemVer` (or `null`) or rejecting with an `Error`. Typically wraps an
 *   Octokit call to fetch a release or tag and parse its semver.
 * @param answers - Mutable answers object (plop prompts) where the resulting
 *   formatted version will be stored.
 * @param answerKey - Key name to assign the formatted version into `answers`.
 * @param semverFormatFn - Optional formatter that converts the `SemVer` into
 *   the desired string representation (defaults to `semver.toString()`).
 * @returns A human-readable message indicating the fetched version. Throws an
 *   `Error` if the fetch fails or yields an invalid version.
 */
export const fetchLatestSemver = async (
  fetchSemverFn: FetchSemverFn,
  answers: Record<string, unknown>,
  answerKey: string,
  semverFormatFn: (semver: SemVer) => string = (semver) => semver.toString(),
) => {
  const version = await fetchSemverFn()
    .andThen((semver) =>
      semver ? okAsync(semver) : errAsync(new Error("Invalid version found")),
    )
    .map(semverFormatFn);

  if (version.isErr()) {
    console.warn(`Could not fetch latest version`);
    throw new Error("Could not fetch latest version", { cause: version.error });
  }
  answers[answerKey] = version.value;
  return `Fetched latest version: ${answers[answerKey]}`;
};
