import { ResultAsync } from "neverthrow";
import { z } from "zod/v4";

/**
 * A utility function to decode and validate data against a given Zod schema.
 *
 * @template T - The type of the data to be validated.
 * @param {z.ZodSchema<T>} schema - The Zod schema used to validate the data.
 * @returns {(data: unknown) => ResultAsync<T, Error>} - A function that takes unknown data,
 * validates it asynchronously against the schema, and returns a `ResultAsync` object.
 *
 * The `ResultAsync` object:
 * - Resolves with the validated data of type `T` if the validation succeeds.
 * - Rejects with an `Error` if the validation fails, including the cause of the failure.
 *
 * @example
 * const schema = z.object({ name: z.string() });
 * const decodeName = decode(schema);
 *
 * decodeName({ name: "John" })
 *   .map((data) => console.log("Valid data:", data))
 *   .mapErr((err) => console.error("Validation error:", err));
 */
export const decode =
  <T>(schema: z.ZodSchema<T>) =>
  (data: unknown): ResultAsync<T, Error> =>
    ResultAsync.fromPromise(
      schema.parseAsync(data),
      (cause) =>
        new Error("Input is not valid for the given schema", { cause }),
    );
