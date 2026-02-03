import { err, ok, Result } from "neverthrow";

import {
  AzureAuthorizationError,
  AzureAuthorizationService,
  DEFAULT_GROUP_SPECS,
  GroupConfig,
  IdentityAlreadyExistsError,
  InvalidAuthorizationFileFormatError,
  makeGroupName,
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
 * Finds and extracts the groups list from content using bracket counting.
 * Returns the match info including start/end positions and content.
 */
const findGroupsList = (
  content: string,
): undefined | { content: string; end: number; start: number } => {
  const startMatch = content.match(/groups\s*=\s*\[/);
  if (!startMatch || startMatch.index === undefined) {
    return undefined;
  }

  const listStartIndex = startMatch.index + startMatch[0].length;
  let depth = 1;
  let i = listStartIndex;

  while (i < content.length && depth > 0) {
    if (content[i] === "[") {
      depth++;
    } else if (content[i] === "]") {
      depth--;
    }
    i++;
  }

  if (depth !== 0) {
    return undefined;
  }

  return {
    content: content.slice(listStartIndex, i - 1),
    end: i,
    start: startMatch.index,
  };
};

/**
 * Parses all group objects from the groups list content.
 * Uses a bracket-counting approach to handle nested arrays within group objects.
 */
const parseGroupObjects = (groupsContent: string): string[] => {
  const groups: string[] = [];
  let depth = 0;
  let currentGroup = "";
  let inGroup = false;

  for (const char of groupsContent) {
    if (char === "{") {
      if (depth === 0) {
        inGroup = true;
        currentGroup = "";
      }
      depth++;
      currentGroup += char;
    } else if (char === "}") {
      depth--;
      currentGroup += char;
      if (depth === 0 && inGroup) {
        groups.push(currentGroup);
        inGroup = false;
      }
    } else if (inGroup) {
      currentGroup += char;
    }
  }

  return groups;
};

/**
 * Parses a single group object from HCL format.
 */
const parseGroupObject = (groupStr: string): GroupConfig | undefined => {
  const nameMatch = groupStr.match(/name\s*=\s*"([^"]+)"/);
  const rolesMatch = groupStr.match(/roles\s*=\s*\[([\s\S]*?)]/);
  const membersMatch = groupStr.match(/members\s*=\s*\[([\s\S]*?)]/);

  if (!nameMatch) {
    return undefined;
  }

  const name = nameMatch[1];
  const roles = rolesMatch
    ? [...rolesMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
    : [];
  const members = membersMatch
    ? [...membersMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
    : [];

  return { members, name, roles };
};

/**
 * Formats a group config to HCL format.
 */
const formatGroupToHcl = (group: GroupConfig): string => {
  const membersStr =
    group.members.length > 0
      ? group.members.map((m) => `      "${m}"`).join(",\n")
      : "";

  const rolesStr = group.roles.map((r) => `      "${r}"`).join(",\n");

  const membersBlock =
    group.members.length > 0
      ? `    members = [\n${membersStr}\n    ]`
      : `    members = []`;

  return `  {
    name = "${group.name}"
${membersBlock},
    roles = [
${rolesStr}
    ]
  }`;
};

/**
 * Checks if two role arrays are equivalent (same roles, order-independent).
 */
const rolesAreEqual = (
  roles1: readonly string[],
  roles2: readonly string[],
): boolean => {
  if (roles1.length !== roles2.length) {
    return false;
  }
  const sorted1 = [...roles1].sort();
  const sorted2 = [...roles2].sort();
  return sorted1.every((role, idx) => role === sorted2[idx]);
};

/**
 * Creates an AzureAuthorizationService implementation that uses regex-based parsing
 * of terraform.tfvars files.
 */
export const makeAzureAuthorizationService = (): AzureAuthorizationService => ({
  addIdentity(
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

  containsIdentityId(content: string, identityId: string): boolean {
    const match = content.match(DIRECTORY_READERS_REGEX);
    if (!match) {
      return false;
    }
    const listContent = match[2];
    // Check if the identity ID exists as a quoted string in the list
    return listContent.includes(`"${identityId}"`);
  },

  containsServicePrincipal(content: string, identityId: string): boolean {
    const match = content.match(DIRECTORY_READERS_REGEX);
    if (!match) {
      return false;
    }
    const listContent = match[2];
    // Check if the service principal exists as a quoted string in the list
    return listContent.includes(`"${identityId}"`);
  },

  upsertGroups(
    content: string,
    prefix: string,
    envShort: string,
  ): Result<string, AzureAuthorizationError> {
    // Build expected groups from defaults
    const expectedGroups: GroupConfig[] = DEFAULT_GROUP_SPECS.map((spec) => ({
      members: [],
      name: makeGroupName(prefix, envShort, spec.groupName),
      roles: [...spec.roles],
    }));

    // Check if groups list exists using bracket-counting approach
    const groupsListInfo = findGroupsList(content);

    if (!groupsListInfo) {
      // Groups list doesn't exist - create it with all default groups
      const groupsHcl = expectedGroups.map(formatGroupToHcl).join(",\n");
      const newGroupsBlock = `\ngroups = [\n${groupsHcl}\n]\n`;

      // Find a good place to insert - after directory_readers or at end
      const directoryReadersMatch = content.match(DIRECTORY_READERS_REGEX);
      if (directoryReadersMatch) {
        const insertIndex =
          (directoryReadersMatch.index ?? 0) + directoryReadersMatch[0].length;
        const updatedContent =
          content.slice(0, insertIndex) +
          newGroupsBlock +
          content.slice(insertIndex);
        return ok(updatedContent);
      }

      // Append at end if no directory_readers found
      return ok(content + newGroupsBlock);
    }

    // Parse existing groups
    const groupObjects = parseGroupObjects(groupsListInfo.content);
    const existingGroups: GroupConfig[] = groupObjects
      .map(parseGroupObject)
      .filter((g): g is GroupConfig => g !== undefined);

    // Create a map of existing groups by name for quick lookup
    const existingGroupsMap = new Map(existingGroups.map((g) => [g.name, g]));

    // Process each expected group
    const finalGroups: GroupConfig[] = [];
    const processedNames = new Set<string>();

    // First, add/update expected groups
    for (const expected of expectedGroups) {
      const existing = existingGroupsMap.get(expected.name);
      processedNames.add(expected.name);

      if (!existing) {
        // Group doesn't exist - add it with empty members
        finalGroups.push(expected);
      } else if (!rolesAreEqual(existing.roles, expected.roles)) {
        // Group exists but roles differ - update roles, preserve members
        finalGroups.push({
          members: existing.members,
          name: expected.name,
          roles: [...expected.roles],
        });
      } else {
        // Group exists with correct roles - keep as is
        finalGroups.push(existing);
      }
    }

    // Keep any extra groups that aren't in our defaults (preserve user-added groups)
    for (const existing of existingGroups) {
      if (!processedNames.has(existing.name)) {
        finalGroups.push(existing);
      }
    }

    // Format all groups to HCL
    const groupsHcl = finalGroups.map(formatGroupToHcl).join(",\n");
    const newGroupsBlock = `groups = [\n${groupsHcl}\n]`;

    // Replace the existing groups block
    const updatedContent =
      content.slice(0, groupsListInfo.start) +
      newGroupsBlock +
      content.slice(groupsListInfo.end);

    return ok(updatedContent);
  },
});
