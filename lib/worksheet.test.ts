import { describe, expect, it } from "vitest";

import {
  maskEnglishWord,
  paginate,
  parseWordEntries,
  resolvePracticeMode,
  revealExampleAnswer,
  seededShuffle,
} from "./worksheet";

describe("parseWordEntries", () => {
  it("parses tab, pipe, and equals separated entries", () => {
    const result = parseWordEntries(
      "苹果\tapple\tn.\tI eat an ____.\n友好的 | kind | adj.\n看电视=watch TV",
    );
    expect(result.entries).toHaveLength(3);
    expect(result.entries[0]).toMatchObject({
      chinese: "苹果",
      english: "apple",
      partOfSpeech: "n.",
    });
    expect(result.invalidLines).toEqual([]);
  });

  it("reports invalid line numbers and removes duplicates", () => {
    const result = parseWordEntries("苹果 | apple\n无分隔符\n苹果 | apple");
    expect(result.entries).toHaveLength(1);
    expect(result.invalidLines).toEqual([2]);
  });
});

describe("worksheet helpers", () => {
  it("masks all but the first letter of each word", () => {
    expect(maskEnglishWord("hard-working")).toBe("h___-w______");
    expect(maskEnglishWord("watch TV")).toBe("w____ T_");
  });

  it("paginates and shuffles deterministically", () => {
    expect(paginate([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(seededShuffle([1, 2, 3, 4], 42)).toEqual(
      seededShuffle([1, 2, 3, 4], 42),
    );
  });

  it("balances mixed practice and falls back when context is unavailable", () => {
    const withExample = {
      id: "one",
      chinese: "苹果",
      english: "apple",
      example: "I eat an ____.",
    };
    const withoutExample = { id: "two", chinese: "友好的", english: "kind" };

    expect(resolvePracticeMode("mixed", withExample, 0)).toBe("recall");
    expect(resolvePracticeMode("mixed", withExample, 1)).toBe("context");
    expect(resolvePracticeMode("mixed", withExample, 2)).toBe("reverse");
    expect(resolvePracticeMode("mixed", withoutExample, 1)).toBe("recall");
    expect(resolvePracticeMode("context", withoutExample, 0)).toBe("recall");
  });

  it("reveals the first answer blank in an example", () => {
    expect(revealExampleAnswer("I eat an ____ every day.", "apple")).toBe(
      "I eat an apple every day.",
    );
  });
});
