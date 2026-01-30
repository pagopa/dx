import { err, ok, Result } from "neverthrow";

import {
  AzureAuthorizationError,
  AzureAuthorizationService,
  IdentityAlreadyExistsError,
  InvalidAuthorizationFileFormatError,
} from "../../domain/azure-authorization.js";

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
  /(directory_readers\s*=\s*\{[\s\S]*?service_principals_name\s*=\s*\[)([\s\S]*?)(][\s\S]*?})/;

/**
 * Creates an AzureAuthorizationService implementation that uses regex-based parsing
 * of terraform.tfvars files.
 */
export const makeAzureAuthorizationService = (): AzureAuthorizationService => ({
  appendToDirectoryReaders(
    content: string,
    identityId: string,
  ): Result<string, AzureAuthorizationError> {
    // Use regex to find and capture the directory_readers.service_principals_name list
    const match = content.match(DIRECTORY_READERS_REGEX);

    if (!match) {
      return err(
        new InvalidAuthorizationFileFormatError(
          "Could not find directory_readers.service_principals_name list",
        ),
      );
    }

    // Extract the three captured groups from the regex:
    // - prefix: everything before the list content (e.g., "service_principals_name = [")
    // - existingItems: the current list content (may include newlines and indentation)
    // - suffix: the closing bracket and everything after (e.g., "]\n}")
    const [, prefix, existingItems, suffix] = match;

    // Check if the identity already exists in the list to prevent duplicates
    if (existingItems.includes(`"${identityId}"`)) {
      return err(new IdentityAlreadyExistsError(identityId));
    }

    // Determine if the list currently has items by checking if there's any non-whitespace content
    const trimmedItems = existingItems.trim();
    const hasExistingItems = trimmedItems.length > 0;

    // Build the new list content following HCL formatting rules:
    // - Items are indented with 4 spaces
    // - Items are separated by commas
    // - The LAST item must NOT have a trailing comma (critical for HCL)
    // - Closing bracket is indented with 2 spaces
    let newListContent: string;
    if (hasExistingItems) {
      // When appending to an existing list:
      // 1. Keep the original leading whitespace/newlines to preserve formatting
      // 2. Remove any trailing comma and whitespace from the last existing item
      //    (since we're adding a new last item)
      // 3. Add a comma after the previous last item (making it no longer the last)
      // 4. Add the new identity WITHOUT a trailing comma (it's now the last item)
      const cleanedItems = existingItems.replace(/,?\s*$/, "");
      newListContent = `${cleanedItems},\n    "${identityId}"\n  `;
    } else {
      // When adding to an empty list:
      // Start with a newline, add the item with 4-space indent, no trailing comma
      newListContent = `\n    "${identityId}"\n  `;
    }

    // Reconstruct the file by replacing the matched section with our updated list
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
