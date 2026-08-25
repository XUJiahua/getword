"use client";

import { useEffect, useMemo, useState } from "react";

import { DEFAULT_BANK, DEFAULT_SOURCE, WORD_BANKS } from "@/lib/banks";
import {
  filterEntriesByProgress,
  getMasteryStatus,
  getProgressCounts,
  isReviewDue,
  normalizeProgress,
  recordPracticeResult,
  REVIEW_INTERVAL_DAYS,
  setMasteryStatus,
  type MasteryStatus,
  type PracticeResult,
  type ProgressMap,
} from "@/lib/progress";
import {
  createPracticeSession,
  createStudyBackup,
  MAX_PRACTICE_SESSIONS,
  mergeWordSources,
  normalizePracticeSessions,
  normalizeWordBooks,
  parseEntriesCsv,
  parseStudyBackup,
  serializeEntriesToCsv,
  setSessionResult,
  type PracticeSession,
  type WordBook,
} from "@/lib/study-data";
import {
  paginate,
  parseWordEntries,
  seededShuffle,
  serializeEntries,
  type EntryFilter,
  type LineStyle,
  type PracticeMode,
} from "@/lib/worksheet";
import { AnswerPaper, StudentPaper } from "./worksheet-paper";
import {
  DataTransferSection,
  SessionReviewSection,
  WordBookSection,
} from "./study-tools";

const CONFIG_KEY = "getword.english.config.v1";
const PROGRESS_KEY = "getword.english.progress.v1";
const LEARNING_KEY = "getword.english.learning.v1";
const SESSIONS_KEY = "getword.english.sessions.v1";
const WORD_BOOKS_KEY = "getword.english.wordbooks.v1";

const filterOptions: ReadonlyArray<{
  value: EntryFilter;
  label: string;
}> = [
  { value: "all", label: "全部词条" },
  { value: "unmastered", label: "待巩固" },
  { value: "learning", label: "生词本" },
  { value: "mastered", label: "已掌握" },
  { value: "review", label: "到期复习" },
];

type StoredConfig = {
  activeWordBookId: string;
  answerPages: boolean;
  bankKey: string;
  dateText: string;
  filter: EntryFilter;
  lineStyle: LineStyle;
  mode: PracticeMode;
  perPage: number;
  selectedWordBookId: string;
  showMeta: boolean;
  shuffle: boolean;
  shuffleSeed: number;
  source: string;
  title: string;
  wordBookName: string;
  zoom: number;
};

const defaultConfig: StoredConfig = {
  activeWordBookId: "",
  answerPages: true,
  bankKey: DEFAULT_BANK.key,
  dateText: "",
  filter: "all",
  lineStyle: "ruled",
  mode: "recall",
  perPage: 10,
  selectedWordBookId: "",
  showMeta: true,
  shuffle: false,
  shuffleSeed: 1,
  source: DEFAULT_SOURCE,
  title: DEFAULT_BANK.title,
  wordBookName: "人物特点",
  zoom: 0.85,
};

type OperationNotice = {
  area: "transfer" | "wordbooks";
  kind: "error" | "success";
  message: string;
} | null;

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

function isLineStyle(value: unknown): value is LineStyle {
  return value === "ruled" || value === "four-line";
}

function isEntryFilter(value: unknown): value is EntryFilter {
  return filterOptions.some((option) => option.value === value);
}

function normalizeConfig(value: unknown): Partial<StoredConfig> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const config = value as Partial<StoredConfig>;
  return {
    activeWordBookId:
      typeof config.activeWordBookId === "string" ? config.activeWordBookId : undefined,
    answerPages: typeof config.answerPages === "boolean" ? config.answerPages : undefined,
    bankKey: typeof config.bankKey === "string" ? config.bankKey : undefined,
    dateText: typeof config.dateText === "string" ? config.dateText : undefined,
    filter: isEntryFilter(config.filter) ? config.filter : undefined,
    lineStyle: isLineStyle(config.lineStyle) ? config.lineStyle : undefined,
    mode: isPracticeMode(config.mode) ? config.mode : undefined,
    perPage: [8, 10, 12].includes(Number(config.perPage)) ? Number(config.perPage) : undefined,
    selectedWordBookId:
      typeof config.selectedWordBookId === "string" ? config.selectedWordBookId : undefined,
    showMeta: typeof config.showMeta === "boolean" ? config.showMeta : undefined,
    shuffle: typeof config.shuffle === "boolean" ? config.shuffle : undefined,
    shuffleSeed: Number.isFinite(config.shuffleSeed) ? Number(config.shuffleSeed) : undefined,
    source: typeof config.source === "string" ? config.source : undefined,
    title: typeof config.title === "string" ? config.title : undefined,
    wordBookName: typeof config.wordBookName === "string" ? config.wordBookName : undefined,
    zoom: [0.7, 0.85, 1].includes(Number(config.zoom)) ? Number(config.zoom) : undefined,
  };
}

function restoreConfig(): Partial<StoredConfig> {
  return normalizeConfig(readStoredJson(CONFIG_KEY));
}

function readStoredJson(key: string): unknown {
  const raw = window.localStorage.getItem(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function restoreProgress(): ProgressMap {
  const legacy = readStoredJson(LEARNING_KEY);
  const progress = normalizeProgress(readStoredJson(PROGRESS_KEY), legacy);
  if (legacy !== undefined) window.localStorage.removeItem(LEARNING_KEY);
  return progress;
}

function makeLocalId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

function safeFileName(value: string, fallback: string): string {
  const result = value.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
  return result || fallback;
}

function downloadText(content: string, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function WorksheetApp() {
  const [config, setConfig] = useState<StoredConfig>(defaultConfig);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [wordBooks, setWordBooks] = useState<WordBook[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [printBatchCode, setPrintBatchCode] = useState("");
  const [notice, setNotice] = useState<OperationNotice>(null);
  const [hydrated, setHydrated] = useState(false);
  const [reviewNow, setReviewNow] = useState(() => new Date());

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setConfig((current) => ({ ...current, ...restoreConfig() }));
      setProgress(restoreProgress());
      setReviewNow(new Date());
      const restoredSessions = normalizePracticeSessions(readStoredJson(SESSIONS_KEY));
      setSessions(restoredSessions);
      setSelectedSessionId(restoredSessions[0]?.id ?? "");
      setWordBooks(normalizeWordBooks(readStoredJson(WORD_BOOKS_KEY)));
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }, [config, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }, [hydrated, progress]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }, [hydrated, sessions]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(WORD_BOOKS_KEY, JSON.stringify(wordBooks));
  }, [hydrated, wordBooks]);

  const parsed = useMemo(() => parseWordEntries(config.source), [config.source]);
  const progressCounts = useMemo(
    () => getProgressCounts(parsed.entries, progress, reviewNow),
    [parsed.entries, progress, reviewNow],
  );
  const activeEntries = useMemo(() => {
    const filtered = filterEntriesByProgress(
      parsed.entries,
      config.filter,
      progress,
      reviewNow,
    );
    return config.shuffle ? seededShuffle(filtered, config.shuffleSeed) : filtered;
  }, [config.filter, config.shuffle, config.shuffleSeed, parsed.entries, progress, reviewNow]);
  const pages = useMemo(
    () => paginate(activeEntries, config.perPage),
    [activeEntries, config.perPage],
  );

  const updateConfig = <Key extends keyof StoredConfig>(
    key: Key,
    value: StoredConfig[Key],
  ) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const loadSelectedBank = () => {
    const bank = WORD_BANKS.find((item) => item.key === config.bankKey) ?? DEFAULT_BANK;
    setConfig((current) => ({
      ...current,
      activeWordBookId: "",
      selectedWordBookId: "",
      source: serializeEntries(bank.entries),
      title: bank.title,
      wordBookName: bank.name.replace(/^示例：/, ""),
    }));
    setNotice(null);
  };

  const updateMastery = (entryId: string, status: MasteryStatus) => {
    const now = new Date();
    setReviewNow(now);
    setProgress((current) => setMasteryStatus(current, entryId, status, now));
  };

  const clearCurrentProgress = () => {
    const entryIds = new Set(parsed.entries.map((entry) => entry.id));
    setProgress((current) => {
      const next = { ...current };
      entryIds.forEach((entryId) => delete next[entryId]);
      return next;
    });
  };

  const handlePrint = () => {
    const now = new Date();
    const id = makeLocalId("session");
    const code = id.slice(-6).toUpperCase();
    const session = createPracticeSession({
      code,
      createdAt: now.toISOString(),
      entries: activeEntries,
      filterLabel: activeFilterLabel,
      id,
      mode: config.mode,
      title: config.title,
    });
    setSessions((current) =>
      normalizePracticeSessions([session, ...current]).slice(0, MAX_PRACTICE_SESSIONS),
    );
    setSelectedSessionId(id);
    setPrintBatchCode(code);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.print());
    });
  };

  const updateSessionResult = (entryId: string, result: PracticeResult) => {
    const session = sessions.find((item) => item.id === selectedSessionId) ?? sessions[0];
    if (!session || session.results[entryId] === result) return;
    const now = new Date();
    setSessions((current) =>
      current.map((item) =>
        item.id === session.id ? setSessionResult(item, entryId, result) : item,
      ),
    );
    setReviewNow(now);
    setProgress((current) => recordPracticeResult(current, entryId, result, now));
  };

  const removeSelectedSession = () => {
    const session = sessions.find((item) => item.id === selectedSessionId) ?? sessions[0];
    if (!session) return;
    const next = sessions.filter((item) => item.id !== session.id);
    setSessions(next);
    setSelectedSessionId(next[0]?.id ?? "");
    if (session.code === printBatchCode) setPrintBatchCode("");
  };

  const selectWordBook = (id: string) => {
    const book = wordBooks.find((item) => item.id === id);
    setConfig((current) => ({
      ...current,
      selectedWordBookId: book?.id ?? "",
    }));
    setNotice(null);
  };

  const saveCurrentWordBook = () => {
    const name = config.wordBookName.trim();
    if (!name) {
      setNotice({ area: "wordbooks", kind: "error", message: "请先填写词库名称。" });
      return;
    }
    if (!parsed.entries.length) {
      setNotice({ area: "wordbooks", kind: "error", message: "当前没有可保存的有效词条。" });
      return;
    }

    const now = new Date().toISOString();
    const existing = wordBooks.find((book) => book.id === config.activeWordBookId);
    const id = existing?.id ?? makeLocalId("book");
    const nextBook: WordBook = {
      createdAt: existing?.createdAt ?? now,
      id,
      name,
      source: serializeEntries(parsed.entries),
      title: config.title,
      updatedAt: now,
    };
    setWordBooks((current) =>
      normalizeWordBooks([nextBook, ...current.filter((book) => book.id !== id)]),
    );
    setConfig((current) => ({
      ...current,
      activeWordBookId: id,
      selectedWordBookId: id,
    }));
    setNotice({
      area: "wordbooks",
      kind: "success",
      message: existing ? `已更新“${name}”。` : `已保存“${name}”。`,
    });
  };

  const loadSelectedWordBook = () => {
    const book = wordBooks.find((item) => item.id === config.selectedWordBookId);
    if (!book) return;
    setConfig((current) => ({
      ...current,
      activeWordBookId: book.id,
      selectedWordBookId: book.id,
      source: book.source,
      title: book.title,
      wordBookName: book.name,
    }));
    setNotice({ area: "wordbooks", kind: "success", message: `已载入“${book.name}”。` });
  };

  const mergeSelectedWordBook = () => {
    const book = wordBooks.find((item) => item.id === config.selectedWordBookId);
    if (!book) return;
    const source = mergeWordSources(config.source, book.source);
    const added = parseWordEntries(source).entries.length - parsed.entries.length;
    setConfig((current) => ({
      ...current,
      activeWordBookId: "",
      selectedWordBookId: "",
      source,
      wordBookName: `${current.wordBookName || current.title} + ${book.name}`,
    }));
    setNotice({
      area: "wordbooks",
      kind: "success",
      message: `已追加 ${Math.max(added, 0)} 个不重复词条，当前内容尚未另存。`,
    });
  };

  const removeSelectedWordBook = () => {
    const book = wordBooks.find((item) => item.id === config.selectedWordBookId);
    if (!book) return;
    setWordBooks((current) => current.filter((item) => item.id !== book.id));
    setConfig((current) => ({
      ...current,
      activeWordBookId:
        current.activeWordBookId === book.id ? "" : current.activeWordBookId,
      selectedWordBookId: "",
    }));
    setNotice({
      area: "wordbooks",
      kind: "success",
      message: `已移除“${book.name}”，当前编辑内容仍然保留。`,
    });
  };

  const exportBackup = () => {
    const backup = createStudyBackup({
      config: { ...config },
      progress,
      sessions,
      wordBooks,
    });
    const date = new Date().toISOString().slice(0, 10);
    downloadText(
      JSON.stringify(backup, null, 2),
      `getword-backup-${date}.json`,
      "application/json;charset=utf-8",
    );
    setNotice({ area: "transfer", kind: "success", message: "完整备份已导出。" });
  };

  const importBackup = async (file: File) => {
    try {
      const backup = parseStudyBackup(JSON.parse(await file.text()) as unknown);
      if (!backup) throw new Error("invalid backup");
      const nextConfig = { ...defaultConfig, ...normalizeConfig(backup.config) };
      const selectedExists = backup.wordBooks.some(
        (book) => book.id === nextConfig.selectedWordBookId,
      );
      const activeExists = backup.wordBooks.some(
        (book) => book.id === nextConfig.activeWordBookId,
      );
      setConfig({
        ...nextConfig,
        activeWordBookId: activeExists ? nextConfig.activeWordBookId : "",
        selectedWordBookId: selectedExists ? nextConfig.selectedWordBookId : "",
      });
      setProgress(backup.progress);
      setReviewNow(new Date());
      setSessions(backup.sessions);
      setSelectedSessionId(backup.sessions[0]?.id ?? "");
      setWordBooks(backup.wordBooks);
      setPrintBatchCode("");
      setNotice({ area: "transfer", kind: "success", message: "完整备份已恢复。" });
    } catch {
      setNotice({ area: "transfer", kind: "error", message: "备份文件无法识别或已经损坏。" });
    }
  };

  const exportCsv = () => {
    if (!parsed.entries.length) {
      setNotice({ area: "transfer", kind: "error", message: "当前没有可导出的有效词条。" });
      return;
    }
    downloadText(
      `\uFEFF${serializeEntriesToCsv(parsed.entries)}`,
      `${safeFileName(config.wordBookName || config.title, "getword-words")}.csv`,
      "text/csv;charset=utf-8",
    );
    setNotice({ area: "transfer", kind: "success", message: "当前词库 CSV 已导出。" });
  };

  const importCsv = async (file: File) => {
    try {
      const result = parseEntriesCsv(await file.text());
      if (!result.entries.length) throw new Error("empty csv");
      const baseName = file.name.replace(/\.csv$/i, "");
      setConfig((current) => ({
        ...current,
        activeWordBookId: "",
        selectedWordBookId: "",
        source: serializeEntries(result.entries),
        title: baseName || current.title,
        wordBookName: baseName,
      }));
      setNotice({
        area: "transfer",
        kind: "success",
        message: `已导入 ${result.entries.length} 个词条${
          result.invalidRows.length ? `，跳过 ${result.invalidRows.length} 行` : ""
        }。`,
      });
    } catch {
      setNotice({ area: "transfer", kind: "error", message: "CSV 中没有可识别的中英词条。" });
    }
  };

  const activeFilterLabel =
    filterOptions.find((option) => option.value === config.filter)?.label ?? "全部词条";

  return (
    <main className="app-shell">
      <aside className="workbench">
        <header className="app-head">
          <div>
            <p className="app-kicker">GETWORD · ENGLISH</p>
            <h1>英语词汇练习纸</h1>
          </div>
          <span className="version-mark">第七批</span>
        </header>

        <section className="control-section first-section">
          <label className="control-label" htmlFor="bank">
            示例词库
          </label>
          <div className="bank-row">
            <select
              id="bank"
              onChange={(event) => updateConfig("bankKey", event.target.value)}
              value={config.bankKey}
            >
              {WORD_BANKS.map((bank) => (
                <option key={bank.key} value={bank.key}>
                  {bank.name}
                </option>
              ))}
            </select>
            <button className="button secondary" onClick={loadSelectedBank} type="button">
              载入
            </button>
          </div>
          <p className="control-hint">
            {WORD_BANKS.find((bank) => bank.key === config.bankKey)?.description}
          </p>
        </section>

        <WordBookSection
          activeId={config.activeWordBookId}
          books={wordBooks}
          name={config.wordBookName}
          notice={notice?.area === "wordbooks" ? notice : null}
          onLoad={loadSelectedWordBook}
          onMerge={mergeSelectedWordBook}
          onNameChange={(value) => updateConfig("wordBookName", value)}
          onRemove={removeSelectedWordBook}
          onSave={saveCurrentWordBook}
          onSelect={selectWordBook}
          selectedId={config.selectedWordBookId}
        />

        <section className="control-section">
          <div className="section-heading-row">
            <label className="control-label" htmlFor="word-source">
              中英词条
            </label>
            <span className="entry-count">有效 {parsed.entries.length} 条</span>
          </div>
          <textarea
            id="word-source"
            onChange={(event) => updateConfig("source", event.target.value)}
            placeholder="苹果 | apple | n. | I eat an ____."
            spellCheck={false}
            value={config.source}
          />
          <p className={parsed.invalidLines.length ? "control-hint error-text" : "control-hint"}>
            每行格式：中文 | 英文 | 词性 | 例句。也支持 Tab 或等号分隔。
            {parsed.invalidLines.length
              ? ` 第 ${parsed.invalidLines.join("、")} 行未识别，已跳过。`
              : ""}
          </p>
        </section>

        <section className="control-section">
          <div className="form-grid two-columns">
            <div className="field">
              <label className="control-label" htmlFor="paper-title">
                标题
              </label>
              <input
                id="paper-title"
                onChange={(event) => updateConfig("title", event.target.value)}
                value={config.title}
              />
            </div>
            <div className="field">
              <label className="control-label" htmlFor="paper-date">
                日期
              </label>
              <input
                id="paper-date"
                onChange={(event) => updateConfig("dateText", event.target.value)}
                placeholder="可留空"
                value={config.dateText}
              />
            </div>
          </div>
        </section>

        <section className="control-section">
          <fieldset className="choice-fieldset">
            <legend className="control-label">练习方式</legend>
            <div className="choice-grid mode-grid">
              {([
                ["recall", "中文写英文", "无字母提示"],
                ["hint", "首字母提示", "适合生词"],
                ["dictation", "英文听写", "家长朗读"],
                ["reverse", "英文写中文", "检查识义"],
                ["context", "语境填空", "结合例句"],
                ["mixed", "混合复习", "三种题型"],
              ] as const).map(([value, label, hint]) => (
                <label className="choice-option" key={value}>
                  <input
                    checked={config.mode === value}
                    name="practice-mode"
                    onChange={() => updateConfig("mode", value)}
                    type="radio"
                    value={value}
                  />
                  <span>
                    <b>{label}</b>
                    <small>{hint}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {config.mode === "reverse" ? (
            <p className="control-hint">英文写中文会自动使用普通横线。</p>
          ) : null}
          {config.mode === "context" || config.mode === "mixed" ? (
            <p className="control-hint">
              没有填空例句的词条会自动退回中文写英文。
            </p>
          ) : null}

          <div className="form-grid three-columns compact-grid">
            <div className="field">
              <label className="control-label" htmlFor="line-style">
                书写线
              </label>
              <select
                id="line-style"
                onChange={(event) => updateConfig("lineStyle", event.target.value as LineStyle)}
                value={config.lineStyle}
              >
                <option value="ruled">普通横线</option>
                <option value="four-line">四线三格</option>
              </select>
            </div>
            <div className="field">
              <label className="control-label" htmlFor="per-page">
                每页词数
              </label>
              <select
                id="per-page"
                onChange={(event) => updateConfig("perPage", Number(event.target.value))}
                value={config.perPage}
              >
                <option value={8}>8</option>
                <option value={10}>10</option>
                <option value={12}>12</option>
              </select>
            </div>
            <div className="field">
              <label className="control-label" htmlFor="entry-filter">
                词条范围
              </label>
              <select
                id="entry-filter"
                onChange={(event) => updateConfig("filter", event.target.value as EntryFilter)}
                value={config.filter}
              >
                {filterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="toggle-list">
            <label className="toggle-row">
              <input
                checked={config.answerPages}
                onChange={(event) => updateConfig("answerPages", event.target.checked)}
                type="checkbox"
              />
              <span>附带答案页</span>
              <small>听写时也作为家长朗读清单</small>
            </label>
            <label className="toggle-row">
              <input
                checked={config.showMeta}
                onChange={(event) => updateConfig("showMeta", event.target.checked)}
                type="checkbox"
              />
              <span>显示姓名和日期</span>
            </label>
            <label className="toggle-row">
              <input
                checked={config.shuffle}
                onChange={(event) => updateConfig("shuffle", event.target.checked)}
                type="checkbox"
              />
              <span>打乱词条顺序</span>
              {config.shuffle ? (
                <button
                  className="text-button"
                  onClick={() => updateConfig("shuffleSeed", config.shuffleSeed + 1)}
                  type="button"
                >
                  换一组
                </button>
              ) : null}
            </label>
          </div>
        </section>

        <section className="control-section print-actions">
          <button
            className="button primary"
            disabled={!activeEntries.length}
            onClick={handlePrint}
            type="button"
          >
            打印 / 保存 PDF
          </button>
          <p className="control-hint">
            打印时保存批次编号；将输出 {pages.length} 张学生页
            {config.answerPages ? `和 ${pages.length} 张答案页` : ""}。
          </p>
        </section>

        <SessionReviewSection
          onRemove={removeSelectedSession}
          onResult={updateSessionResult}
          onSelect={setSelectedSessionId}
          selectedId={selectedSessionId}
          sessions={sessions}
        />

        <section className="control-section">
          <div className="section-heading-row">
            <div>
              <h2 className="control-label">练习结果</h2>
              <p className="control-hint no-margin">
                答对后按 {REVIEW_INTERVAL_DAYS.join(" / ")} 天递增复习；“疑”次日复习，“错”立即回到生词本。
              </p>
            </div>
            {progressCounts.learning + progressCounts.mastered > 0 ? (
              <button
                className="text-button muted-text-button"
                onClick={clearCurrentProgress}
                type="button"
              >
                重置当前
              </button>
            ) : null}
          </div>
          <div className="progress-summary" aria-label="当前词库学习进度">
            <span>待巩固 {progressCounts.unmastered}</span>
            <span>生词 {progressCounts.learning}</span>
            <span>已掌握 {progressCounts.mastered}</span>
            <span>到期 {progressCounts.review}</span>
          </div>
          <div className="entry-review-list">
            {parsed.entries.map((entry, index) => {
              const status = getMasteryStatus(progress, entry.id);
              const isDueMastered =
                status === "mastered" && isReviewDue(progress[entry.id], reviewNow);
              const displayedStatus = isDueMastered ? "review" : status;
              return (
                <div className="entry-review-row" key={entry.id}>
                  <span className="entry-index">{index + 1}</span>
                  <span className="entry-chinese">{entry.chinese}</span>
                  <span className="entry-english">{entry.english}</span>
                  <select
                    aria-label={`${entry.chinese}：掌握状态`}
                    className={`status-select ${displayedStatus}`}
                    onChange={(event) =>
                      updateMastery(entry.id, event.target.value as MasteryStatus)
                    }
                    value={displayedStatus}
                  >
                    {isDueMastered ? (
                      <option disabled value="review">
                        到期
                      </option>
                    ) : null}
                    <option value="new">待练</option>
                    <option value="learning">生词</option>
                    <option value="mastered">掌握</option>
                  </select>
                </div>
              );
            })}
            {!parsed.entries.length ? <p className="empty-control">暂无有效词条。</p> : null}
          </div>
        </section>

        <DataTransferSection
          notice={notice?.area === "transfer" ? notice : null}
          onExportBackup={exportBackup}
          onExportCsv={exportCsv}
          onImportBackup={importBackup}
          onImportCsv={importCsv}
        />
      </aside>

      <section className="preview" aria-label="A4 打印预览">
        <div className="preview-toolbar">
          <div>
            <span className="preview-label">A4 预览</span>
            <span className="preview-summary">
              {activeEntries.length} 词 · {activeFilterLabel} · {pages.length} 学生页
              {config.answerPages ? ` · ${pages.length} 答案页` : ""}
            </span>
          </div>
          <div className="zoom-control" aria-label="预览缩放">
            {[0.7, 0.85, 1].map((zoom) => (
              <button
                aria-pressed={config.zoom === zoom}
                className={config.zoom === zoom ? "zoom-button active" : "zoom-button"}
                key={zoom}
                onClick={() => updateConfig("zoom", zoom)}
                type="button"
              >
                {Math.round(zoom * 100)}%
              </button>
            ))}
          </div>
        </div>

        <div className="paper-viewport">
          <div className="paper-stack" style={{ zoom: config.zoom }}>
            {pages.map((pageEntries, index) => (
              <StudentPaper
                batchCode={printBatchCode}
                dateText={config.dateText}
                entries={pageEntries}
                key={`student-${index}`}
                lineStyle={config.lineStyle}
                mode={config.mode}
                pageNumber={index + 1}
                pageTotal={pages.length}
                perPage={config.perPage}
                showMeta={config.showMeta}
                startIndex={index * config.perPage}
                title={config.title}
              />
            ))}
            {config.answerPages
              ? pages.map((pageEntries, index) => (
                  <AnswerPaper
                    batchCode={printBatchCode}
                    dateText={config.dateText}
                    entries={pageEntries}
                    key={`answer-${index}`}
                    mode={config.mode}
                    pageNumber={index + 1}
                    pageTotal={pages.length}
                    perPage={config.perPage}
                    showMeta={config.showMeta}
                    startIndex={index * config.perPage}
                    title={config.title}
                  />
                ))
              : null}
          </div>
        </div>
      </section>
    </main>
  );
}
