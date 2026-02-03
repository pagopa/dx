import { assert, describe, expect, it } from "vitest";

import {
  DEFAULT_GROUP_SPECS,
  IdentityAlreadyExistsError,
  InvalidAuthorizationFileFormatError,
  makeGroupName,
} from "../../../domain/azure-authorization.js";
import { makeAzureAuthorizationService } from "../index.js";

const makeSampleTfvars = (servicePrincipals: string[] = []) => {
  const listContent =
    servicePrincipals.length > 0
      ? "\n" +
        servicePrincipals
          .map(
            (sp, idx, arr) =>
              idx === arr.length - 1
                ? `    "${sp}"` // Last item: no trailing comma
                : `    "${sp}",`, // Other items: with comma
          )
          .join("\n") +
        "\n  "
      : "";

  return `
subscription_name = "test-subscription"

directory_readers = {
  groups_name = [
    "group-1",
    "group-2",
  ]
  service_principals_name = [${listContent}]
}

other_config = {
  key = "value"
}
`.trim();
};

const makeSampleTfvarsWithoutDirectoryReaders = () =>
  `
subscription_name = "test-subscription"

other_config = {
  key = "value"
}
`.trim();

// eslint-disable-next-line max-lines-per-function
describe("AzureAuthorizationService", () => {
  describe("containsIdentityId", () => {
    it("should return false when the identity does not exist in an empty list", () => {
      const service = makeAzureAuthorizationService();
      const content = makeSampleTfvars([]);

      const result = service.containsIdentityId(content, "new-identity-id");

      expect(result).toBe(false);
    });

    it("should return false when the identity does not exist in a populated list", () => {
      const service = makeAzureAuthorizationService();
      const content = makeSampleTfvars([
        "existing-identity-1",
        "existing-identity-2",
      ]);

      const result = service.containsIdentityId(content, "new-identity-id");

      expect(result).toBe(false);
    });

    it("should return true when the identity exists in the list", () => {
      const service = makeAzureAuthorizationService();
      const content = makeSampleTfvars([
        "existing-identity-1",
        "target-identity",
        "existing-identity-2",
      ]);

      const result = service.containsIdentityId(content, "target-identity");

      expect(result).toBe(true);
    });

    it("should return false when directory_readers block does not exist", () => {
      const service = makeAzureAuthorizationService();
      const content = makeSampleTfvarsWithoutDirectoryReaders();

      const result = service.containsIdentityId(content, "any-identity-id");

      expect(result).toBe(false);
    });
  });

  describe("addIdentity", () => {
    it("should append identity to an empty service_principals_name list", () => {
      const service = makeAzureAuthorizationService();
      const content = makeSampleTfvars([]);

      const result = service.addIdentity(content, "new-bootstrap-identity");

      expect(result.isOk()).toBe(true);
      const updatedContent = result._unsafeUnwrap();
      expect(updatedContent).toContain('"new-bootstrap-identity"');
      expect(
        service.containsIdentityId(updatedContent, "new-bootstrap-identity"),
      ).toBe(true);
    });

    it("should append identity to an existing service_principals_name list", () => {
      const service = makeAzureAuthorizationService();
      const content = makeSampleTfvars([
        "existing-identity-1",
        "existing-identity-2",
      ]);

      const result = service.addIdentity(content, "new-bootstrap-identity");

      expect(result.isOk()).toBe(true);
      const updatedContent = result._unsafeUnwrap();
      // Should contain all identities
      expect(updatedContent).toContain('"existing-identity-1"');
      expect(updatedContent).toContain('"existing-identity-2"');
      expect(updatedContent).toContain('"new-bootstrap-identity"');
    });

    it("should return IdentityAlreadyExistsError when identity already exists", () => {
      const service = makeAzureAuthorizationService();
      const content = makeSampleTfvars(["existing-identity"]);

      const result = service.addIdentity(content, "existing-identity");

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(
        IdentityAlreadyExistsError,
      );
      expect(result._unsafeUnwrapErr().message).toContain("existing-identity");
    });

    it("should return InvalidAuthorizationFileFormatError when directory_readers block is missing", () => {
      const service = makeAzureAuthorizationService();
      const content = makeSampleTfvarsWithoutDirectoryReaders();

      const result = service.addIdentity(content, "new-bootstrap-identity");

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(
        InvalidAuthorizationFileFormatError,
      );
      expect(result._unsafeUnwrapErr().message).toContain(
        "Could not find directory_readers.service_principals_name list",
      );
    });

    it("should preserve other content in the tfvars file", () => {
      const service = makeAzureAuthorizationService();
      const content = makeSampleTfvars(["existing-identity"]);

      const result = service.addIdentity(content, "new-bootstrap-identity");

      expect(result.isOk()).toBe(true);
      const updatedContent = result._unsafeUnwrap();
      // Should preserve other configurations
      expect(updatedContent).toContain(
        'subscription_name = "test-subscription"',
      );
      expect(updatedContent).toContain('"group-1"');
      expect(updatedContent).toContain('"group-2"');
      expect(updatedContent).toContain('key = "value"');
    });

    it("should handle complex formatting in existing lists", () => {
      const service = makeAzureAuthorizationService();
      // Create a more complex tfvars content
      const complexContent = `
subscription_name = "complex-subscription"

directory_readers = {
  groups_name = []
  service_principals_name = [
    "identity-with-special-chars-123",
    "another-identity_456",
  ]
}
`.trim();

      const result = service.addIdentity(complexContent, "third-identity");

      expect(result.isOk()).toBe(true);
      const updatedContent = result._unsafeUnwrap();
      expect(updatedContent).toContain('"identity-with-special-chars-123"');
      expect(updatedContent).toContain('"another-identity_456"');
      expect(updatedContent).toContain('"third-identity"');
    });

    it("should not add trailing comma to the last item", () => {
      const service = makeAzureAuthorizationService();
      const content = makeSampleTfvars(["existing-identity"]);

      const result = service.addIdentity(content, "new-identity");

      expect(result.isOk()).toBe(true);
      const updatedContent = result._unsafeUnwrap();

      // Extract the service_principals_name list
      const match = updatedContent.match(
        /service_principals_name\s*=\s*\[([\s\S]*?)]/,
      );
      expect(match).not.toBeNull();

      assert.ok(match);
      const listContent = match[1];

      // Should NOT have trailing comma before closing bracket
      expect(listContent.trim()).not.toMatch(/,\s*$/);

      // Should have "new-identity" without trailing comma
      expect(listContent).toMatch(/"new-identity"\s*$/m);
    });

    it("should preserve HCL formatting with proper indentation", () => {
      const service = makeAzureAuthorizationService();
      const content = makeSampleTfvars(["identity-1", "identity-2"]);

      const result = service.addIdentity(content, "identity-3");

      expect(result.isOk()).toBe(true);
      const updatedContent = result._unsafeUnwrap();

      // Should have proper format:
      // service_principals_name = [
      //     "identity-1",
      //     "identity-2",
      //     "identity-3"
      //   ]

      expect(updatedContent).toContain('    "identity-1",\n');
      expect(updatedContent).toContain('    "identity-2",\n');
      expect(updatedContent).toContain('    "identity-3"\n  ]');

      // Last item should NOT have comma
      expect(updatedContent).not.toContain('"identity-3",');
    });
  });

  // eslint-disable-next-line max-lines-per-function
  describe("upsertGroups", () => {
    const makeTfvarsWithGroups = (groups: string) =>
      `
env_short = "d"
prefix    = "test"

directory_readers = {
  service_principals_name = []
}

groups = [
${groups}
]

vpn = {
  members = []
}
`.trim();

    const makeTfvarsWithoutGroups = () =>
      `
env_short = "d"
prefix    = "test"

directory_readers = {
  service_principals_name = []
}

vpn = {
  members = []
}
`.trim();

    it("should create groups list when it does not exist", () => {
      const service = makeAzureAuthorizationService();
      const content = makeTfvarsWithoutGroups();

      const result = service.upsertGroups(content, "test", "d");

      expect(result.isOk()).toBe(true);
      const updatedContent = result._unsafeUnwrap();

      // Should contain all 8 default groups
      for (const spec of DEFAULT_GROUP_SPECS) {
        const groupName = makeGroupName("test", "d", spec.groupName);
        expect(updatedContent).toContain(`name = "${groupName}"`);
      }

      // Should have groups = [ block
      expect(updatedContent).toContain("groups = [");
    });

    it("should add missing groups to existing groups list", () => {
      const service = makeAzureAuthorizationService();
      // Only has admin group
      const existingGroup = `  {
    name = "test-d-adgroup-admin"
    members = [
      "user@example.com"
    ],
    roles = [
      "Owner"
    ]
  }`;
      const content = makeTfvarsWithGroups(existingGroup);

      const result = service.upsertGroups(content, "test", "d");

      expect(result.isOk()).toBe(true);
      const updatedContent = result._unsafeUnwrap();

      // Should contain all 8 default groups
      for (const spec of DEFAULT_GROUP_SPECS) {
        const groupName = makeGroupName("test", "d", spec.groupName);
        expect(updatedContent).toContain(`name = "${groupName}"`);
      }

      // Should preserve existing member
      expect(updatedContent).toContain('"user@example.com"');
    });

    it("should update roles when they differ from expected", () => {
      const service = makeAzureAuthorizationService();
      // Admin group with wrong roles
      const existingGroup = `  {
    name = "test-d-adgroup-admin"
    members = [
      "admin@example.com"
    ],
    roles = [
      "Reader"
    ]
  }`;
      const content = makeTfvarsWithGroups(existingGroup);

      const result = service.upsertGroups(content, "test", "d");

      expect(result.isOk()).toBe(true);
      const updatedContent = result._unsafeUnwrap();

      // Should have updated to Owner role
      expect(updatedContent).toContain('"Owner"');
      // Should preserve existing member
      expect(updatedContent).toContain('"admin@example.com"');
    });

    it("should preserve groups that already have correct configuration", () => {
      const service = makeAzureAuthorizationService();
      const existingGroup = `  {
    name = "test-d-adgroup-admin"
    members = [
      "existing@example.com"
    ],
    roles = [
      "Owner"
    ]
  }`;
      const content = makeTfvarsWithGroups(existingGroup);

      const result = service.upsertGroups(content, "test", "d");

      expect(result.isOk()).toBe(true);
      const updatedContent = result._unsafeUnwrap();

      // Should preserve existing member
      expect(updatedContent).toContain('"existing@example.com"');
    });

    it("should preserve non-default groups", () => {
      const service = makeAzureAuthorizationService();
      const existingGroups = `  {
    name = "test-d-adgroup-admin"
    members = [],
    roles = [
      "Owner"
    ]
  },
  {
    name = "test-d-custom-group"
    members = [
      "custom@example.com"
    ],
    roles = [
      "Contributor"
    ]
  }`;
      const content = makeTfvarsWithGroups(existingGroups);

      const result = service.upsertGroups(content, "test", "d");

      expect(result.isOk()).toBe(true);
      const updatedContent = result._unsafeUnwrap();

      // Should preserve custom group
      expect(updatedContent).toContain('"test-d-custom-group"');
      expect(updatedContent).toContain('"custom@example.com"');
      expect(updatedContent).toContain('"Contributor"');
    });

    it("should create groups with empty members array", () => {
      const service = makeAzureAuthorizationService();
      const content = makeTfvarsWithoutGroups();

      const result = service.upsertGroups(content, "test", "d");

      expect(result.isOk()).toBe(true);
      const updatedContent = result._unsafeUnwrap();

      // New groups should have empty members
      expect(updatedContent).toContain("members = []");
    });

    it("should preserve other content in the tfvars file", () => {
      const service = makeAzureAuthorizationService();
      const content = makeTfvarsWithoutGroups();

      const result = service.upsertGroups(content, "test", "d");

      expect(result.isOk()).toBe(true);
      const updatedContent = result._unsafeUnwrap();

      // Should preserve other configurations
      expect(updatedContent).toContain('env_short = "d"');
      expect(updatedContent).toContain('prefix    = "test"');
      expect(updatedContent).toContain("directory_readers");
      expect(updatedContent).toContain("vpn");
    });

    it("should handle all default groups with correct roles", () => {
      const service = makeAzureAuthorizationService();
      const content = makeTfvarsWithoutGroups();

      const result = service.upsertGroups(content, "dx", "d");

      expect(result.isOk()).toBe(true);
      const updatedContent = result._unsafeUnwrap();

      // Check specific groups have expected roles
      // Admin should have Owner
      expect(updatedContent).toContain('"dx-d-adgroup-admin"');

      // Operations should have multiple roles including Reader
      expect(updatedContent).toContain('"dx-d-adgroup-operations"');
      expect(updatedContent).toContain('"Monitoring Contributor"');
      expect(updatedContent).toContain('"Storage Blob Data Reader"');
    });
  });
});
