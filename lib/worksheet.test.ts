import { describe, expect, it } from "vitest";

import {
  maskEnglishWord,
  movePageOverflow,
  paginate,
  parseLooseWordEntries,
  parseWordEntries,
  resolvePracticeMode,
  revealExampleAnswer,
  serializeEntries,
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

  it("serializes optional trailing fields without empty separators", () => {
    expect(
      serializeEntries([
        { id: "one", chinese: "苹果", english: "apple", partOfSpeech: "n." },
        { id: "two", chinese: "梨", english: "pear" },
      ]),
    ).toBe("苹果 | apple | n.\n梨 | pear");
  });
});

describe("parseLooseWordEntries", () => {
  it("recognizes common pasted Chinese-English formats in either order", () => {
    const result = parseLooseWordEntries(
      [
        "1. apple 苹果",
        "香蕉 | banana | n. | I eat a ____.",
        "watch TV - 看电视",
        "友好的 kind",
        "星期一\tMonday\tn.",
      ].join("\n"),
    );

    expect(result.entries).toMatchObject([
      { chinese: "苹果", english: "apple" },
      { chinese: "香蕉", english: "banana", partOfSpeech: "n.", example: "I eat a ____." },
      { chinese: "看电视", english: "watch TV" },
      { chinese: "友好的", english: "kind" },
      { chinese: "星期一", english: "Monday", partOfSpeech: "n." },
    ]);
    expect(result.invalidLines).toEqual([]);
  });

  it("reports invalid and duplicate pasted lines for import preview", () => {
    const result = parseLooseWordEntries("苹果 | apple\n无法识别\napple = 苹果");
    expect(result.entries).toHaveLength(1);
    expect(result.invalidLines).toEqual([2]);
    expect(result.duplicateLines).toEqual([3]);
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

  it("moves measured A4 overflow forward without changing entry order", () => {
    const pages = [["one", "two", "three", "four"], ["five", "six", "seven"]];
    expect(movePageOverflow(pages, 0, 3, 4)).toEqual([
      ["one", "two", "three"],
      ["four", "five", "six", "seven"],
    ]);
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
