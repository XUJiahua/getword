import { describe, expect, it } from "vitest";

import {
  filterEntriesByProgress,
  getMasteryStatus,
  getProgressCounts,
  isReviewDue,
  normalizeProgress,
  setMasteryStatus,
  type ProgressMap,
} from "./progress";

const NOW = new Date("2026-08-25T12:00:00.000Z");
const entries = [
  { id: "new", chinese: "新的", english: "new" },
  { id: "learning", chinese: "生词", english: "word" },
  { id: "fresh", chinese: "刚掌握", english: "fresh" },
  { id: "due", chinese: "需复习", english: "review" },
];

const progress: ProgressMap = {
  learning: { status: "learning", updatedAt: "2026-08-25T10:00:00.000Z" },
  fresh: { status: "mastered", updatedAt: "2026-08-23T12:00:00.000Z" },
  due: { status: "mastered", updatedAt: "2026-08-18T12:00:00.000Z" },
};

describe("progress helpers", () => {
  it("migrates valid legacy learning ids and ignores malformed records", () => {
    expect(
      normalizeProgress(
        {
          saved: { status: "mastered", updatedAt: "2026-08-20T12:00:00.000Z" },
          broken: { status: "mastered", updatedAt: "not-a-date" },
        },
        ["legacy", "saved", 42],
        NOW,
      ),
    ).toEqual({
      saved: { status: "mastered", updatedAt: "2026-08-20T12:00:00.000Z" },
      legacy: { status: "learning", updatedAt: NOW.toISOString() },
    });
  });

  it("sets and clears mastery status without mutating the original map", () => {
    const mastered = setMasteryStatus({}, "word", "mastered", NOW);
    expect(getMasteryStatus(mastered, "word")).toBe("mastered");
    expect(
      setMasteryStatus(
        mastered,
        "word",
        "mastered",
        new Date("2026-08-26T12:00:00.000Z"),
      ).word.updatedAt,
    ).toBe("2026-08-26T12:00:00.000Z");
    expect(setMasteryStatus(mastered, "word", "new", NOW)).toEqual({});
    expect(mastered.word.status).toBe("mastered");
  });

  it("makes learning words due immediately and mastered words due after seven days", () => {
    expect(isReviewDue(progress.learning, NOW)).toBe(true);
    expect(isReviewDue(progress.fresh, NOW)).toBe(false);
    expect(isReviewDue(progress.due, NOW)).toBe(true);
  });

  it("filters each local wordbook and reports progress counts", () => {
    expect(filterEntriesByProgress(entries, "unmastered", progress, NOW).map((x) => x.id))
      .toEqual(["new", "learning"]);
    expect(filterEntriesByProgress(entries, "learning", progress, NOW).map((x) => x.id))
      .toEqual(["learning"]);
    expect(filterEntriesByProgress(entries, "mastered", progress, NOW).map((x) => x.id))
      .toEqual(["fresh", "due"]);
    expect(filterEntriesByProgress(entries, "review", progress, NOW).map((x) => x.id))
      .toEqual(["learning", "due"]);
    expect(getProgressCounts(entries, progress, NOW)).toEqual({
      learning: 1,
      mastered: 2,
      review: 2,
      unmastered: 2,
    });
  });
});
