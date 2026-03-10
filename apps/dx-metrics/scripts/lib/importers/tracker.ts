/** This module imports tracker CSV snapshots into PostgreSQL. */

import fs from "fs";
import * as schema from "../../../src/db/schema";
import type { ImportContext } from "../import-context";

const splitCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      result.push(currentValue.trim().replace(/^"|"$/g, ""));
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  result.push(currentValue.trim().replace(/^"|"$/g, ""));
  return result;
};

const parseTrackerDate = (rawDate: string): Date | null => {
  if (!rawDate) {
    return null;
  }

  const italianDateMatch = rawDate.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2}),?\s*(\d{1,2}):(\d{1,2})$/,
  );
  if (italianDateMatch) {
    const [, day, month, year, hours, minutes] = italianDateMatch;
    return new Date(
      2000 + Number.parseInt(year, 10),
      Number.parseInt(month, 10) - 1,
      Number.parseInt(day, 10),
      Number.parseInt(hours, 10),
      Number.parseInt(minutes, 10),
    );
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
    const parsedDate = new Date(rawDate);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  return null;
};

const getColumnValue = (
  columns: string[],
  index: number,
  fallback = "",
): string => {
  if (index < 0 || !columns[index] || columns[index] === "undefined") {
    return fallback;
  }

  return columns[index];
};

export async function importTrackerCsv(
  context: ImportContext,
  csvPath: string,
): Promise<void> {
  console.log(`  Importing tracker CSV from ${csvPath}...`);

  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length < 2) {
    console.log("    ⚠ CSV is empty");
    return;
  }

  const headers = splitCsvLine(lines[0]);
  const submittedIndex = headers.findIndex((header) =>
    header.toLowerCase().includes("data di invio"),
  );
  const closedIndex = headers.findIndex((header) =>
    header.toLowerCase().includes("data di scadenza"),
  );
  const categoryIndex = headers.findIndex((header) =>
    header.toLowerCase().includes("tipologia"),
  );
  const priorityIndex = headers.findIndex((header) =>
    header.toLowerCase().includes("priorit"),
  );
  const isClosedIndex = headers.findIndex((header) =>
    header.toLowerCase().includes("completato"),
  );
  const statusIndex = headers.findIndex((header) =>
    header.toLowerCase().includes("status"),
  );

  await context.db.delete(schema.trackerRequests);

  let importedCount = 0;
  for (let index = 1; index < lines.length; index += 1) {
    const columns = splitCsvLine(lines[index]);

    const rawSubmittedAt = getColumnValue(columns, submittedIndex);
    const rawClosedAt = getColumnValue(columns, closedIndex);

    await context.db.insert(schema.trackerRequests).values({
      submittedAt: parseTrackerDate(rawSubmittedAt),
      closedAt: parseTrackerDate(rawClosedAt),
      category: getColumnValue(columns, categoryIndex),
      priority: getColumnValue(columns, priorityIndex),
      isClosed: getColumnValue(columns, isClosedIndex),
      status: getColumnValue(columns, statusIndex),
      rawSubmittedAt,
      rawClosedAt,
    });

    importedCount += 1;
  }

  console.log(`    ✓ ${importedCount} tracker requests imported`);
}
