export type PracticeMode =
  | "recall"
  | "hint"
  | "dictation"
  | "reverse"
  | "context"
  | "mixed";
export type ResolvedPracticeMode = Exclude<PracticeMode, "mixed">;
export type LineStyle = "ruled" | "four-line";
export type EntryFilter = "all" | "learning";

export type WordEntry = {
  id: string;
  chinese: string;
  english: string;
  partOfSpeech?: string;
  example?: string;
};

export type ParseResult = {
  entries: WordEntry[];
  invalidLines: number[];
};

export function makeEntryId(parts: string[]): string {
  const source = parts.join("\u241f").toLowerCase();
  let hash = 5381;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 33) ^ source.charCodeAt(index);
  }
  return `en-${(hash >>> 0).toString(36)}`;
}

function detectSeparator(line: string): string | null {
  if (line.includes("\t")) return "\t";
  if (line.includes("|")) return "|";
  if (line.includes("=")) return "=";
  return null;
}

export function parseWordEntries(source: string): ParseResult {
  const invalidLines: number[] = [];
  const seen = new Set<string>();
  const entries: WordEntry[] = [];

  source.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;

    const separator = detectSeparator(line);
    if (!separator) {
      invalidLines.push(index + 1);
      return;
    }

    const [chinese = "", english = "", partOfSpeech = "", example = ""] =
      line.split(separator).map((part) => part.trim());

    if (!chinese || !english) {
      invalidLines.push(index + 1);
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

  return { entries, invalidLines };
}

export function serializeEntries(entries: WordEntry[]): string {
  return entries
    .map((entry) =>
      [entry.chinese, entry.english, entry.partOfSpeech ?? "", entry.example ?? ""]
        .join(" | ")
        .replace(/(?: \| ){2}$/, ""),
    )
    .join("\n");
}

export function maskEnglishWord(word: string): string {
  let atWordStart = true;
  return Array.from(word)
    .map((character) => {
      if (/[a-z]/i.test(character)) {
        const output = atWordStart ? character : "_";
        atWordStart = false;
        return output;
      }
      if (/[-\s/]/.test(character)) atWordStart = true;
      return character;
    })
    .join("");
}

export function resolvePracticeMode(
  mode: PracticeMode,
  entry: WordEntry,
  index: number,
): ResolvedPracticeMode {
  if (mode !== "mixed") {
    if (mode === "context" && !entry.example?.includes("__")) return "recall";
    return mode;
  }

  const pattern: ResolvedPracticeMode[] = ["recall", "context", "reverse"];
  const resolved = pattern[index % pattern.length];
  if (resolved === "context" && !entry.example?.includes("__")) return "recall";
  return resolved;
}

export function revealExampleAnswer(example: string, answer: string): string {
  return example.replace(/_{2,}/, answer);
}

export function paginate<T>(items: T[], size: number): T[][] {
  if (!items.length) return [[]];
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

export function seededShuffle<T>(items: T[], seed: number): T[] {
  const output = [...items];
  let state = seed >>> 0;
  const random = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  for (let index = output.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [output[index], output[target]] = [output[target], output[index]];
  }
  return output;
}
