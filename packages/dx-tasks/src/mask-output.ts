/** This module masks sensitive Terraform output before dx-tasks prints it. */

const escapeRegExp = (string: string): string =>
  string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const maskOutput = (
  input: string,
  additionalKeys: string[] = [],
): string => {
  const keys = additionalKeys.map((k) => k.trim()).filter((k) => k.length > 0);

  let masked = input;

  for (const key of keys) {
    const escapedKey = escapeRegExp(key);
    const diffRegex = new RegExp(
      `("?${escapedKey}[^"]*"?\\s*=\\s*)"[^"]*"(\\s*->\\s*)"[^"]*"`,
      "ig",
    );
    masked = masked.replace(diffRegex, '$1"[REDACTED]"$2"[REDACTED]"');

    const normalRegex = new RegExp(
      `("?${escapedKey}[^"]*"?\\s*=\\s*)"[^"]*"`,
      "ig",
    );
    masked = masked.replace(normalRegex, '$1"[REDACTED]"');
  }

  const pemRegex = /-----BEGIN\s+.*?-----.*?-----END\s+.*?-----/gis;
  masked = masked.replace(pemRegex, "[REDACTED]");

  const knownSecretsPattern =
    "(AccessKey|AccountKey|Password|secret|SecretToken|AuthToken|auth_token|access_key|apiKey|api_key|connection_string)";

  const hardcodedDiffRegex = new RegExp(
    `("?[^"\\s]*${knownSecretsPattern}([^A-Za-z0-9]|$)"?\\s*[:=]\\s*)"([^"]{12,})"(\\s*->\\s*)"([^"]{12,})"`,
    "ig",
  );
  masked = masked.replace(hardcodedDiffRegex, '$1"[REDACTED]"$5"[REDACTED]"');

  const hardcodedNormalRegex = new RegExp(
    `("?[^"\\s]*${knownSecretsPattern}([^A-Za-z0-9]|$)"?\\s*[:=]\\s*)"([^"]{12,})"`,
    "ig",
  );
  masked = masked.replace(hardcodedNormalRegex, '$1"[REDACTED]"');

  return masked;
};
