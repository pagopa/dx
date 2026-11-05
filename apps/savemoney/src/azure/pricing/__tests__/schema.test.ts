/**
 * Tests for the Retail Prices API zod schemas, focused on the API's real
 * (and easy to overlook) quirks rather than the happy path already covered
 * indirectly by client.test.ts.
 */

import { describe, expect, it } from "vitest";

import { PriceItemSchema } from "../schema.js";

describe("PriceItemSchema", () => {
  it("accepts empty strings for optional metadata fields", () => {
    // The Retail Prices API returns "" (not the field omitted) for meters
    // that don't have a given attribute, e.g. `armSkuName` on
    // Bandwidth/Support meters. Resolvers already treat "" and `undefined`
    // the same way (`?.toLowerCase() ?? ""`), so the schema must tolerate it.
    const item = {
      armSkuName: "",
      currencyCode: "EUR",
      retailPrice: 1,
      type: "Consumption",
      unitOfMeasure: "1 Hour",
      unitPrice: 1,
    };

    const result = PriceItemSchema.parse(item);

    expect(result.armSkuName).toBe("");
  });
});
