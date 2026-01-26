import { assert, describe, expect, it } from "vitest";

import {
  IdentityAlreadyExistsError,
  InvalidTfvarsFormatError,
} from "../../../domain/tfvars.js";
import { makeTfvarsService } from "../index.js";

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
describe("TfvarsService", () => {
  describe("containsServicePrincipal", () => {
    it("should return false when the identity does not exist in an empty list", () => {
      const service = makeTfvarsService();
      const content = makeSampleTfvars([]);

      const result = service.containsServicePrincipal(
        content,
        "new-identity-id",
      );

      expect(result).toBe(false);
    });

    it("should return false when the identity does not exist in a populated list", () => {
      const service = makeTfvarsService();
      const content = makeSampleTfvars([
        "existing-identity-1",
        "existing-identity-2",
      ]);

      const result = service.containsServicePrincipal(
        content,
        "new-identity-id",
      );

      expect(result).toBe(false);
    });

    it("should return true when the identity exists in the list", () => {
      const service = makeTfvarsService();
      const content = makeSampleTfvars([
        "existing-identity-1",
        "target-identity",
        "existing-identity-2",
      ]);

      const result = service.containsServicePrincipal(
        content,
        "target-identity",
      );

      expect(result).toBe(true);
    });

    it("should return false when directory_readers block does not exist", () => {
      const service = makeTfvarsService();
      const content = makeSampleTfvarsWithoutDirectoryReaders();

      const result = service.containsServicePrincipal(
        content,
        "any-identity-id",
      );

      expect(result).toBe(false);
    });
  });

  describe("appendToDirectoryReaders", () => {
    it("should append identity to an empty service_principals_name list", () => {
      const service = makeTfvarsService();
      const content = makeSampleTfvars([]);

      const result = service.appendToDirectoryReaders(
        content,
        "new-bootstrap-identity",
      );

      expect(result.isOk()).toBe(true);
      const updatedContent = result._unsafeUnwrap();
      expect(updatedContent).toContain('"new-bootstrap-identity"');
      expect(
        service.containsServicePrincipal(
          updatedContent,
          "new-bootstrap-identity",
        ),
      ).toBe(true);
    });

    it("should append identity to an existing service_principals_name list", () => {
      const service = makeTfvarsService();
      const content = makeSampleTfvars([
        "existing-identity-1",
        "existing-identity-2",
      ]);

      const result = service.appendToDirectoryReaders(
        content,
        "new-bootstrap-identity",
      );

      expect(result.isOk()).toBe(true);
      const updatedContent = result._unsafeUnwrap();
      // Should contain all identities
      expect(updatedContent).toContain('"existing-identity-1"');
      expect(updatedContent).toContain('"existing-identity-2"');
      expect(updatedContent).toContain('"new-bootstrap-identity"');
    });

    it("should return IdentityAlreadyExistsError when identity already exists", () => {
      const service = makeTfvarsService();
      const content = makeSampleTfvars(["existing-identity"]);

      const result = service.appendToDirectoryReaders(
        content,
        "existing-identity",
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(
        IdentityAlreadyExistsError,
      );
      expect(result._unsafeUnwrapErr().message).toContain("existing-identity");
    });

    it("should return InvalidTfvarsFormatError when directory_readers block is missing", () => {
      const service = makeTfvarsService();
      const content = makeSampleTfvarsWithoutDirectoryReaders();

      const result = service.appendToDirectoryReaders(
        content,
        "new-bootstrap-identity",
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(
        InvalidTfvarsFormatError,
      );
      expect(result._unsafeUnwrapErr().message).toContain(
        "Could not find directory_readers.service_principals_name list",
      );
    });

    it("should preserve other content in the tfvars file", () => {
      const service = makeTfvarsService();
      const content = makeSampleTfvars(["existing-identity"]);

      const result = service.appendToDirectoryReaders(
        content,
        "new-bootstrap-identity",
      );

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
      const service = makeTfvarsService();
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

      const result = service.appendToDirectoryReaders(
        complexContent,
        "third-identity",
      );

      expect(result.isOk()).toBe(true);
      const updatedContent = result._unsafeUnwrap();
      expect(updatedContent).toContain('"identity-with-special-chars-123"');
      expect(updatedContent).toContain('"another-identity_456"');
      expect(updatedContent).toContain('"third-identity"');
    });

    it("should not add trailing comma to the last item", () => {
      const service = makeTfvarsService();
      const content = makeSampleTfvars(["existing-identity"]);

      const result = service.appendToDirectoryReaders(content, "new-identity");

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
      const service = makeTfvarsService();
      const content = makeSampleTfvars(["identity-1", "identity-2"]);

      const result = service.appendToDirectoryReaders(content, "identity-3");

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
});
