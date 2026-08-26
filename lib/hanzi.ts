import { pinyin } from "pinyin-pro";

export type HanziMode = "write" | "trace" | "strokes" | "copy" | "dictation";
export type HanziGridType = "tian" | "mi" | "line";
export type HanziPrintFilter =
  | "all"
  | "hideMastered"
  | "onlyLearning"
  | "onlyMastered";
export type HanziWordStatus = "" | "learning" | "mastered";

export type HanziItem = {
  pinyin: string;
  word: string;
};

export type HanziLesson = {
  kind: string | null;
  no: number;
  recognizeCharCount: number;
  title: string;
  wordCount: number;
  writeCharCount: number;
};

export type HanziBankUnit = {
  key: string;
  lessons: HanziLesson[];
  name: string;
  words: string[];
};

export type HanziBank = {
  grade: number;
  name: string;
  semester: string;
  short: string;
  source: {
    edition: string;
    extractedAt: string;
    label: string;
    pdfFilename: string;
    type: string;
  };
  units: HanziBankUnit[];
};

export type HanziWordRecords = Record<string, Exclude<HanziWordStatus, "">>;

export function chineseChars(word: string): string[] {
  return Array.from(word).filter((char) => /\p{Script=Han}/u.test(char));
}

export function splitWords(source: string): string[] {
  const seen = new Set<string>();
  return source
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((word) => chineseChars(word).length > 0)
    .filter((word) => {
      if (seen.has(word)) return false;
      seen.add(word);
      return true;
    });
}

export function autoPinyin(word: string): string {
  return pinyin(word, {
    nonZh: "removed",
    toneType: "symbol",
    type: "array",
  }).join(" ");
}

export function splitItemPinyin(item: HanziItem): string[] {
  const chars = chineseChars(item.word);
  const parts = item.pinyin.split(/\s+/).filter(Boolean);
  if (parts.length === chars.length) return parts;
  if (chars.length === 1) return [item.pinyin];
  return chars.map((_, index) => parts[index] ?? "");
}

export function filterHanziWords(
  words: string[],
  filter: HanziPrintFilter,
  records: HanziWordRecords,
): string[] {
  if (filter === "hideMastered") {
    return words.filter((word) => records[word] !== "mastered");
  }
  if (filter === "onlyLearning") {
    return words.filter((word) => records[word] === "learning");
  }
  if (filter === "onlyMastered") {
    return words.filter((word) => records[word] === "mastered");
  }
  return words;
}

export function paginateHanziItems<T>(items: T[], perPage: number): T[][] {
  if (!items.length) return [[]];
  const size = Math.max(1, Math.floor(perPage));
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

export function wordsForBank(bank: HanziBank, unitKey: string): string[] {
  const units = unitKey ? bank.units.filter((unit) => unit.key === unitKey) : bank.units;
  return Array.from(new Set(units.flatMap((unit) => unit.words)));
}
