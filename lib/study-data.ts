import {
  normalizeProgress,
  type PracticeResult,
  type ProgressMap,
} from "./progress";
import {
  makeEntryId,
  parseWordEntries,
  serializeEntries,
  type PracticeMode,
  type WordEntry,
} from "./worksheet";

export const BACKUP_VERSION = 1;
export const MAX_PRACTICE_SESSIONS = 20;

export type PracticeSession = {
  code: string;
  createdAt: string;
  entries: WordEntry[];
  filterLabel: string;
  id: string;
  mode: PracticeMode;
  results: Record<string, PracticeResult>;
  title: string;
};

export type WordBook = {
  createdAt: string;
  id: string;
  name: string;
  source: string;
  title: string;
  updatedAt: string;
};

export type StudyBackup = {
  config: Record<string, unknown>;
  exportedAt: string;
  progress: ProgressMap;
  sessions: PracticeSession[];
  version: typeof BACKUP_VERSION;
  wordBooks: WordBook[];
};

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isPracticeMode(value: unknown): value is PracticeMode {
  return (
    value === "recall" ||
    value === "hint" ||
    value === "dictation" ||
    value === "reverse" ||
    value === "context" ||
    value === "mixed"
  );
}

function isPracticeResult(value: unknown): value is PracticeResult {
  return value === "correct" || value === "unsure" || value === "wrong";
}

function normalizeEntry(value: unknown): WordEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entry = value as Partial<WordEntry>;
  if (
    typeof entry.id !== "string" ||
    typeof entry.chinese !== "string" ||
    typeof entry.english !== "string" ||
    !entry.chinese.trim() ||
    !entry.english.trim()
  ) {
    return null;
  }
  return {
    id: entry.id,
    chinese: entry.chinese,
    english: entry.english,
    partOfSpeech:
      typeof entry.partOfSpeech === "string" && entry.partOfSpeech
        ? entry.partOfSpeech
        : undefined,
    example: typeof entry.example === "string" && entry.example ? entry.example : undefined,
  };
}

export function createPracticeSession(input: {
  code: string;
  createdAt: string;
  entries: WordEntry[];
  filterLabel: string;
  id: string;
  mode: PracticeMode;
  title: string;
}): PracticeSession {
  return {
    ...input,
    entries: input.entries.map((entry) => ({ ...entry })),
    results: {},
  };
}

export function setSessionResult(
  session: PracticeSession,
  entryId: string,
  result: PracticeResult,
): PracticeSession {
  if (!session.entries.some((entry) => entry.id === entryId)) return session;
  return {
    ...session,
    results: { ...session.results, [entryId]: result },
  };
}

export function getSessionResultCounts(session: PracticeSession) {
  const counts = { correct: 0, unsure: 0, wrong: 0, unmarked: 0 };
  session.entries.forEach((entry) => {
    const result = session.results[entry.id];
    if (result) counts[result] += 1;
    else counts.unmarked += 1;
  });
  return counts;
}

export function normalizePracticeSessions(value: unknown): PracticeSession[] {
  if (!Array.isArray(value)) return [];
  const sessions: PracticeSession[] = [];

  value.forEach((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return;
    const session = candidate as Partial<PracticeSession>;
    if (
      typeof session.id !== "string" ||
      typeof session.code !== "string" ||
      !isValidDate(session.createdAt) ||
      typeof session.title !== "string" ||
      typeof session.filterLabel !== "string" ||
      !isPracticeMode(session.mode) ||
      !Array.isArray(session.entries)
    ) {
      return;
    }

    const entries = session.entries
      .map(normalizeEntry)
      .filter((entry): entry is WordEntry => entry !== null);
    if (!entries.length) return;

    const results: Record<string, PracticeResult> = {};
    if (session.results && typeof session.results === "object") {
      Object.entries(session.results).forEach(([entryId, result]) => {
        if (entries.some((entry) => entry.id === entryId) && isPracticeResult(result)) {
          results[entryId] = result;
        }
      });
    }

    sessions.push({
      code: session.code,
      createdAt: session.createdAt,
      entries,
      filterLabel: session.filterLabel,
      id: session.id,
      mode: session.mode,
      results,
      title: session.title,
    });
  });

  return sessions
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, MAX_PRACTICE_SESSIONS);
}

export function normalizeWordBooks(value: unknown): WordBook[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const books: WordBook[] = [];

  value.forEach((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return;
    const book = candidate as Partial<WordBook>;
    if (
      typeof book.id !== "string" ||
      seen.has(book.id) ||
      typeof book.name !== "string" ||
      !book.name.trim() ||
      typeof book.source !== "string" ||
      typeof book.title !== "string" ||
      !isValidDate(book.createdAt) ||
      !isValidDate(book.updatedAt)
    ) {
      return;
    }
    seen.add(book.id);
    books.push({
      createdAt: book.createdAt,
      id: book.id,
      name: book.name.trim(),
      source: book.source,
      title: book.title,
      updatedAt: book.updatedAt,
    });
  });

  return books.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export function mergeWordSources(current: string, incoming: string): string {
  const merged = parseWordEntries(`${current}\n${incoming}`).entries;
  return serializeEntries(merged);
}

function escapeCsvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function serializeEntriesToCsv(entries: WordEntry[]): string {
  const rows = [
    ["中文", "英文", "词性", "例句"],
    ...entries.map((entry) => [
      entry.chinese,
      entry.english,
      entry.partOfSpeech ?? "",
      entry.example ?? "",
    ]),
  ];
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

function readCsvRows(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

export function parseEntriesCsv(source: string) {
  const rows = readCsvRows(source.replace(/^\uFEFF/, ""));
  const invalidRows: number[] = [];
  const entries: WordEntry[] = [];
  const seen = new Set<string>();
  if (!rows.length) return { entries, invalidRows };

  const aliases = {
    chinese: ["中文", "chinese", "释义"],
    english: ["英文", "english", "单词"],
    partOfSpeech: ["词性", "partofspeech", "pos"],
    example: ["例句", "example", "sentence"],
  };
  const first = rows[0].map(normalizeHeader);
  const hasHeader = first.some((cell) =>
    Object.values(aliases).some((values) => values.includes(cell)),
  );
  const indexFor = (key: keyof typeof aliases, fallback: number) => {
    const index = first.findIndex((cell) => aliases[key].includes(cell));
    return index >= 0 ? index : fallback;
  };
  const indexes = {
    chinese: hasHeader ? indexFor("chinese", 0) : 0,
    english: hasHeader ? indexFor("english", 1) : 1,
    partOfSpeech: hasHeader ? indexFor("partOfSpeech", 2) : 2,
    example: hasHeader ? indexFor("example", 3) : 3,
  };

  rows.slice(hasHeader ? 1 : 0).forEach((row, index) => {
    const chinese = row[indexes.chinese]?.trim() ?? "";
    const english = row[indexes.english]?.trim() ?? "";
    const partOfSpeech = row[indexes.partOfSpeech]?.trim() ?? "";
    const example = row[indexes.example]?.trim() ?? "";
    if (!chinese || !english) {
      invalidRows.push(index + (hasHeader ? 2 : 1));
      return;
    }
    const id = makeEntryId([chinese, english, partOfSpeech]);
    if (seen.has(id)) return;
    seen.add(id);
    entries.push({
      id,
      chinese,
      english,
      partOfSpeech: partOfSpeech || undefined,
      example: example || undefined,
    });
  });

  return { entries, invalidRows };
}

export function createStudyBackup(input: Omit<StudyBackup, "exportedAt" | "version">): StudyBackup {
  return {
    ...input,
    exportedAt: new Date().toISOString(),
    version: BACKUP_VERSION,
  };
}

export function parseStudyBackup(value: unknown, now = new Date()): StudyBackup | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const backup = value as Partial<StudyBackup>;
  if (
    backup.version !== BACKUP_VERSION ||
    !backup.config ||
    typeof backup.config !== "object" ||
    Array.isArray(backup.config)
  ) {
    return null;
  }

  return {
    config: backup.config as Record<string, unknown>,
    exportedAt: isValidDate(backup.exportedAt) ? backup.exportedAt : now.toISOString(),
    progress: normalizeProgress(backup.progress, undefined, now),
    sessions: normalizePracticeSessions(backup.sessions),
    version: BACKUP_VERSION,
    wordBooks: normalizeWordBooks(backup.wordBooks),
  };
}
