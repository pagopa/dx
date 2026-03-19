/** Shared Zod helpers for validating SQL query results at the domain boundary. */

import { z } from "zod";

const sqlDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const sqlMonthPattern = /^\d{4}-\d{2}$/;

const coerceSqlNumber = (value: unknown): unknown => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return value;
};

const normalizeSqlDateValue = (value: unknown): unknown => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (sqlDatePattern.test(trimmed)) return trimmed;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
};

const normalizeSqlTimestampValue = (value: unknown): unknown => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value.trim();
  return value;
};

const formatIssuePath = (path: readonly PropertyKey[]): string =>
  path.length === 0 ? "result" : path.map(String).join(".");

const formatIssues = (error: z.ZodError): string =>
  error.issues
    .map((issue) => `${formatIssuePath(issue.path)}: ${issue.message}`)
    .join("; ");

const buildInvalidSqlResultError = (
  context: string,
  error: z.ZodError,
): Error =>
  new Error(`Invalid SQL result for ${context}: ${formatIssues(error)}`);

export const sqlDateSchema = z.preprocess(
  normalizeSqlDateValue,
  z.string().regex(sqlDatePattern),
);

export const nullableSqlDateSchema = z.preprocess(
  (value) => (value === null ? null : normalizeSqlDateValue(value)),
  z.string().regex(sqlDatePattern).nullable(),
);

export const sqlMonthSchema = z.string().regex(sqlMonthPattern);

export const sqlNumberSchema = z.preprocess(
  coerceSqlNumber,
  z.number().finite(),
);

export const nullableSqlNumberSchema = z.preprocess(
  (value) => (value === null ? null : coerceSqlNumber(value)),
  z.number().finite().nullable(),
);

export const sqlTimestampSchema = z.preprocess(
  normalizeSqlTimestampValue,
  z.string().min(1),
);

export const nullableSqlTimestampSchema = z.preprocess(
  (value) => (value === null ? null : normalizeSqlTimestampValue(value)),
  z.string().min(1).nullable(),
);

export const parseSqlRow = <TSchema extends z.ZodType>(
  schema: TSchema,
  row: unknown,
  context: string,
): z.infer<TSchema> => {
  const result = schema.safeParse(row);
  if (result.success) {
    return result.data;
  }
  throw buildInvalidSqlResultError(context, result.error);
};

export const parseOptionalSqlRow = <TSchema extends z.ZodType>(
  schema: TSchema,
  row: unknown,
  context: string,
): undefined | z.infer<TSchema> => {
  if (row === undefined) return undefined;
  return parseSqlRow(schema, row, context);
};

export const parseSqlRows = <TSchema extends z.ZodType>(
  schema: TSchema,
  rows: readonly unknown[],
  context: string,
): z.infer<TSchema>[] => {
  const result = z.array(schema).safeParse(rows);
  if (result.success) {
    return result.data;
  }
  throw buildInvalidSqlResultError(context, result.error);
};
