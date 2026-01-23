import { err, ok, Result } from "neverthrow";

import {
  IdentityAlreadyExistsError,
  InvalidTfvarsFormatError,
  TfvarsError,
  TfvarsService,
} from "../../domain/tfvars.js";

/**
 * Regex pattern to match the directory_readers block and capture the service_principals_name list.
 * This pattern handles HCL format with nested blocks.
 *
 * Captures:
 * - Group 1: Everything before the list content (including opening bracket)
 * - Group 2: The list content (items inside the brackets)
 * - Group 3: The closing bracket and everything after until end of directory_readers block
 */
const DIRECTORY_READERS_REGEX =
  /(directory_readers\s*=\s*\{[\s\S]*?service_principals_name\s*=\s*\[)([\s\S]*?)(\][\s\S]*?\})/;

/**
 * Creates a TfvarsService implementation that uses regex-based parsing.
 */
export const makeTfvarsService = (): TfvarsService => ({
  appendToDirectoryReaders(
    content: string,
    identityId: string,
  ): Result<string, TfvarsError> {
    const match = content.match(DIRECTORY_READERS_REGEX);

    if (!match) {
      return err(
        new InvalidTfvarsFormatError(
          "Could not find directory_readers.service_principals_name list",
        ),
      );
    }

    const [, prefix, existingItems, suffix] = match;

    // Check for duplicates
    if (existingItems.includes(`"${identityId}"`)) {
      return err(new IdentityAlreadyExistsError(identityId));
    }

    // Parse existing items to determine formatting
    const trimmedItems = existingItems.trim();
    const hasExistingItems = trimmedItems.length > 0;

    // Build the new list content
    let newListContent: string;
    if (hasExistingItems) {
      // Remove trailing whitespace/newlines from existing items and add comma + new item
      const cleanedItems = trimmedItems.replace(/,?\s*$/, "");
      newListContent = `${cleanedItems},\n    "${identityId}",\n  `;
    } else {
      // Empty list, just add the new item
      newListContent = `\n    "${identityId}",\n  `;
    }

    const updatedContent = content.replace(
      DIRECTORY_READERS_REGEX,
      `${prefix}${newListContent}${suffix}`,
    );

    return ok(updatedContent);
  },

  containsServicePrincipal(content: string, identityId: string): boolean {
    const match = content.match(DIRECTORY_READERS_REGEX);
    if (!match) {
      return false;
    }
    const listContent = match[2];
    // Check if the identity ID exists as a quoted string in the list
    return listContent.includes(`"${identityId}"`);
  },
});
