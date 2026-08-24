"use client";

import { useEffect, useMemo, useState } from "react";

import { DEFAULT_BANK, DEFAULT_SOURCE, WORD_BANKS } from "@/lib/banks";
import {
  paginate,
  parseWordEntries,
  seededShuffle,
  type EntryFilter,
  type LineStyle,
  type PracticeMode,
} from "@/lib/worksheet";
import { AnswerPaper, StudentPaper } from "./worksheet-paper";

const CONFIG_KEY = "getword.english.config.v1";
const LEARNING_KEY = "getword.english.learning.v1";

type StoredConfig = {
  answerPages: boolean;
  bankKey: string;
  dateText: string;
  filter: EntryFilter;
  lineStyle: LineStyle;
  mode: PracticeMode;
  perPage: number;
  showMeta: boolean;
  shuffle: boolean;
  shuffleSeed: number;
  source: string;
  title: string;
  zoom: number;
};

const defaultConfig: StoredConfig = {
  answerPages: true,
  bankKey: DEFAULT_BANK.key,
  dateText: "",
  filter: "all",
  lineStyle: "ruled",
  mode: "recall",
  perPage: 10,
  showMeta: true,
  shuffle: false,
  shuffleSeed: 1,
  source: DEFAULT_SOURCE,
  title: DEFAULT_BANK.title,
  zoom: 0.85,
};

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

function restoreConfig(): Partial<StoredConfig> {
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    if (!raw) return {};
    const value = JSON.parse(raw) as Partial<StoredConfig>;
    return {
      answerPages: typeof value.answerPages === "boolean" ? value.answerPages : undefined,
      bankKey: typeof value.bankKey === "string" ? value.bankKey : undefined,
      dateText: typeof value.dateText === "string" ? value.dateText : undefined,
      filter: value.filter === "learning" || value.filter === "all" ? value.filter : undefined,
      lineStyle: isLineStyle(value.lineStyle) ? value.lineStyle : undefined,
      mode: isPracticeMode(value.mode) ? value.mode : undefined,
      perPage: [8, 10, 12].includes(Number(value.perPage)) ? Number(value.perPage) : undefined,
      showMeta: typeof value.showMeta === "boolean" ? value.showMeta : undefined,
      shuffle: typeof value.shuffle === "boolean" ? value.shuffle : undefined,
      shuffleSeed: Number.isFinite(value.shuffleSeed) ? Number(value.shuffleSeed) : undefined,
      source: typeof value.source === "string" ? value.source : undefined,
      title: typeof value.title === "string" ? value.title : undefined,
      zoom: [0.7, 0.85, 1].includes(Number(value.zoom)) ? Number(value.zoom) : undefined,
    };
  } catch {
    return {};
  }
}

function restoreLearning(): Set<string> {
  try {
    const raw = window.localStorage.getItem(LEARNING_KEY);
    if (!raw) return new Set();
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value)
      ? new Set(value.filter((item): item is string => typeof item === "string"))
      : new Set();
  } catch {
    return new Set();
  }
}

export function WorksheetApp() {
  const [config, setConfig] = useState<StoredConfig>(defaultConfig);
  const [learningIds, setLearningIds] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setConfig((current) => ({ ...current, ...restoreConfig() }));
      setLearningIds(restoreLearning());
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
    window.localStorage.setItem(LEARNING_KEY, JSON.stringify([...learningIds]));
  }, [hydrated, learningIds]);

  const parsed = useMemo(() => parseWordEntries(config.source), [config.source]);
  const activeEntries = useMemo(() => {
    const filtered =
      config.filter === "learning"
        ? parsed.entries.filter((entry) => learningIds.has(entry.id))
        : parsed.entries;
    return config.shuffle ? seededShuffle(filtered, config.shuffleSeed) : filtered;
  }, [config.filter, config.shuffle, config.shuffleSeed, learningIds, parsed.entries]);
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
      source: bank.entries
        .map((item) =>
          [item.chinese, item.english, item.partOfSpeech ?? "", item.example ?? ""]
            .join(" | ")
            .replace(/(?: \| ){2}$/, ""),
        )
        .join("\n"),
      title: bank.title,
    }));
  };

  const toggleLearning = (entryId: string) => {
    setLearningIds((current) => {
      const next = new Set(current);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  };

  return (
    <main className="app-shell">
      <aside className="workbench">
        <header className="app-head">
          <div>
            <p className="app-kicker">GETWORD · ENGLISH</p>
            <h1>英语词汇练习纸</h1>
          </div>
          <span className="version-mark">第一版</span>
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
                <option value="all">全部词条</option>
                <option value="learning">只练生词</option>
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

        <section className="control-section">
          <div className="section-heading-row">
            <div>
              <h2 className="control-label">生词标记</h2>
              <p className="control-hint no-margin">练后把“疑”和“错”点为生词，下次可单独打印。</p>
            </div>
            {learningIds.size ? (
              <button
                className="text-button muted-text-button"
                onClick={() => setLearningIds(new Set())}
                type="button"
              >
                清空 {learningIds.size} 个
              </button>
            ) : null}
          </div>
          <div className="entry-review-list">
            {parsed.entries.map((entry, index) => {
              const isLearning = learningIds.has(entry.id);
              return (
                <div className="entry-review-row" key={entry.id}>
                  <span className="entry-index">{index + 1}</span>
                  <span className="entry-chinese">{entry.chinese}</span>
                  <span className="entry-english">{entry.english}</span>
                  <button
                    aria-pressed={isLearning}
                    className={isLearning ? "status-button active" : "status-button"}
                    onClick={() => toggleLearning(entry.id)}
                    type="button"
                  >
                    {isLearning ? "生词" : "标记"}
                  </button>
                </div>
              );
            })}
            {!parsed.entries.length ? <p className="empty-control">暂无有效词条。</p> : null}
          </div>
        </section>

        <section className="control-section print-actions">
          <button
            className="button primary"
            disabled={!activeEntries.length}
            onClick={() => window.print()}
            type="button"
          >
            打印 / 保存 PDF
          </button>
          <p className="control-hint">
            将打印 {pages.length} 张学生页
            {config.answerPages ? `和 ${pages.length} 张答案页` : ""}。
          </p>
        </section>
      </aside>

      <section className="preview" aria-label="A4 打印预览">
        <div className="preview-toolbar">
          <div>
            <span className="preview-label">A4 预览</span>
            <span className="preview-summary">
              {activeEntries.length} 词 · {pages.length} 学生页
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
