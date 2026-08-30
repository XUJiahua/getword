import { describe, expect, it } from "vitest";

import type { ProgressMap } from "./progress";
import {
  createPracticeSession,
  createStudyBackup,
  getSessionResultCounts,
  mergeWordSources,
  normalizePracticeSessions,
  normalizeWordBooks,
  parseEntriesCsv,
  parseStudyBackup,
  serializeEntriesToCsv,
  setSessionResult,
} from "./study-data";

const entry = {
  id: "apple",
  chinese: "苹果",
  english: "apple",
  partOfSpeech: "n.",
  example: "I eat an apple.",
};

describe("practice sessions", () => {
  it("stores a print snapshot and records results without changing the original", () => {
    const session = createPracticeSession({
      code: "ABC123",
      createdAt: "2026-08-25T12:00:00.000Z",
      entries: [entry],
      filterLabel: "生词本",
      id: "session-one",
      mode: "recall",
      title: "Unit 1",
      variantCount: 2,
    });
    const recorded = setSessionResult(session, entry.id, "correct");
    expect(session.results).toEqual({});
    expect(recorded.results).toEqual({ apple: "correct" });
    expect(getSessionResultCounts(recorded)).toEqual({
      correct: 1,
      unsure: 0,
      unmarked: 0,
      wrong: 0,
    });
    expect(recorded.variantCount).toBe(2);
  });

  it("drops malformed sessions and results", () => {
    expect(
      normalizePracticeSessions([
        {
          code: "ABC123",
          createdAt: "2026-08-25T12:00:00.000Z",
          entries: [entry],
          filterLabel: "全部词条",
          id: "valid",
          mode: "mixed",
          results: { apple: "wrong", missing: "correct", bad: "maybe" },
          title: "Unit 1",
        },
        { id: "broken" },
      ]),
    ).toMatchObject([{ variantCount: 1 }]);
  });
});

describe("word books and CSV", () => {
  it("merges word sources and removes duplicate entries", () => {
    expect(
      mergeWordSources("苹果 | apple | n.\n香蕉 | banana", "苹果 | apple | n.\n梨 | pear"),
    ).toBe("苹果 | apple | n.\n香蕉 | banana\n梨 | pear");
  });

  it("round-trips quoted CSV content", () => {
    const csv = serializeEntriesToCsv([
      { ...entry, example: 'I say, "apple".' },
      { id: "pear", chinese: "梨", english: "pear" },
    ]);
    const result = parseEntriesCsv(csv);
    expect(result.invalidRows).toEqual([]);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({
      chinese: "苹果",
      english: "apple",
      example: 'I say, "apple".',
    });
  });

  it("normalizes named books and removes duplicate ids", () => {
    expect(
      normalizeWordBooks([
        {
          createdAt: "2026-08-25T12:00:00.000Z",
          id: "book-one",
          name: " Unit 1 ",
          source: "苹果 | apple",
          title: "Unit 1",
          updatedAt: "2026-08-25T13:00:00.000Z",
        },
        {
          createdAt: "2026-08-25T12:00:00.000Z",
          id: "book-one",
          name: "重复",
          source: "",
          title: "",
          updatedAt: "2026-08-25T14:00:00.000Z",
        },
      ]),
    ).toMatchObject([{ id: "book-one", name: "Unit 1" }]);
  });
});

describe("study backup", () => {
  it("round-trips config, progress, sessions, and books", () => {
    const progress: ProgressMap = {
      apple: {
        intervalDays: 1,
        nextReviewAt: "2026-08-26T12:00:00.000Z",
        status: "mastered",
        streak: 1,
        updatedAt: "2026-08-25T12:00:00.000Z",
      },
    };
    const session = createPracticeSession({
      code: "ABC123",
      createdAt: "2026-08-25T12:00:00.000Z",
      entries: [entry],
      filterLabel: "全部词条",
      id: "session-one",
      mode: "recall",
      title: "Unit 1",
    });
    const wordBook = {
      createdAt: "2026-08-25T12:00:00.000Z",
      id: "book-one",
      name: "Unit 1",
      source: "苹果 | apple | n.",
      title: "Unit 1",
      updatedAt: "2026-08-25T12:00:00.000Z",
    };
    const backup = createStudyBackup({
      config: { title: "Unit 1" },
      progress,
      sessions: [session],
      wordBooks: [wordBook],
    });
    const restored = parseStudyBackup(backup);
    expect(restored?.config).toEqual({ title: "Unit 1" });
    expect(restored?.progress).toEqual(progress);
    expect(restored?.sessions).toHaveLength(1);
    expect(restored?.wordBooks).toHaveLength(1);
  });
});
