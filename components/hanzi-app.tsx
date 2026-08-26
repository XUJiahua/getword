"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { HanziPaper, type HanziStrokeData } from "./hanzi-paper";
import {
  autoPinyin,
  chineseChars,
  filterHanziWords,
  moveHanziPageOverflow,
  paginateHanziItems,
  splitWords,
  wordsForBank,
  type HanziBank,
  type HanziGridType,
  type HanziItem,
  type HanziMode,
  type HanziPrintFilter,
  type HanziWordRecords,
  type HanziWordStatus,
} from "@/lib/hanzi";
import {
  HANZI_BANKS,
  hanziBankUrl,
  isHanziBankKey,
  type HanziBankKey,
} from "@/lib/hanzi-banks";

const CONFIG_KEY = "getword.hanzi.config.v1";
const PINYIN_KEY = "getword.hanzi.pinyin.v1";
const RECORDS_KEY = "getword.hanzi.records.v1";
const STROKES_CDN = "https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1";

const strokeCache = new Map<string, Promise<HanziStrokeData | null>>();

type HanziConfig = {
  bankKey: HanziBankKey;
  copies: number;
  dateText: string;
  filter: HanziPrintFilter;
  gridType: HanziGridType;
  mode: HanziMode;
  perPage: number;
  showMeta: boolean;
  source: string;
  title: string;
  unitKey: string;
  zoom: number;
};

const defaultConfig: HanziConfig = {
  bankKey: "grade1a",
  copies: 1,
  dateText: "",
  filter: "all",
  gridType: "tian",
  mode: "write",
  perPage: 32,
  showMeta: false,
  source: "春天\n学校\n认真\n一心一意\n长大\n音乐",
  title: "看拼音写汉字",
  unitKey: "",
  zoom: 1,
};

function readStoredJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : undefined;
  } catch {
    return undefined;
  }
}

function restoreStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function restoreRecords(value: unknown): HanziWordRecords {
  return Object.fromEntries(
    Object.entries(restoreStringRecord(value)).filter(
      ([, status]) => status === "learning" || status === "mastered",
    ),
  ) as HanziWordRecords;
}

function restoreConfig(value: unknown): Partial<HanziConfig> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const saved = value as Partial<HanziConfig>;
  return {
    bankKey:
      typeof saved.bankKey === "string" && isHanziBankKey(saved.bankKey)
        ? saved.bankKey
        : undefined,
    copies: [1, 2, 3, 4].includes(Number(saved.copies)) ? Number(saved.copies) : undefined,
    dateText: typeof saved.dateText === "string" ? saved.dateText : undefined,
    filter: ["all", "hideMastered", "onlyLearning", "onlyMastered"].includes(
      String(saved.filter),
    )
      ? saved.filter
      : undefined,
    gridType: ["tian", "mi", "line"].includes(String(saved.gridType))
      ? saved.gridType
      : undefined,
    mode: ["write", "trace", "strokes", "copy", "dictation"].includes(
      String(saved.mode),
    )
      ? saved.mode
      : undefined,
    perPage: [16, 24, 32, 40, 48].includes(Number(saved.perPage))
      ? Number(saved.perPage)
      : undefined,
    showMeta: typeof saved.showMeta === "boolean" ? saved.showMeta : undefined,
    source: typeof saved.source === "string" ? saved.source : undefined,
    title: typeof saved.title === "string" ? saved.title : undefined,
    unitKey: typeof saved.unitKey === "string" ? saved.unitKey : undefined,
    zoom: [0.7, 0.85, 1].includes(Number(saved.zoom)) ? Number(saved.zoom) : undefined,
  };
}

function loadStrokeData(char: string): Promise<HanziStrokeData | null> {
  const cached = strokeCache.get(char);
  if (cached) return cached;
  const request = fetch(`${STROKES_CDN}/${encodeURIComponent(char)}.json`)
    .then((response) => {
      if (!response.ok) throw new Error(`stroke data ${response.status}`);
      return response.json() as Promise<HanziStrokeData>;
    })
    .catch(() => null);
  strokeCache.set(char, request);
  return request;
}

export function HanziApp() {
  const [config, setConfig] = useState<HanziConfig>(defaultConfig);
  const [bankResult, setBankResult] = useState<{
    bank: HanziBank | null;
    error: string;
    key: HanziBankKey;
  } | null>(null);
  const [pinyinOverrides, setPinyinOverrides] = useState<Record<string, string>>({});
  const [records, setRecords] = useState<HanziWordRecords>({});
  const [strokeResult, setStrokeResult] = useState<{
    data: Map<string, HanziStrokeData | null>;
    key: string;
  } | null>(null);
  const [paginationResult, setPaginationResult] = useState<{
    key: string;
    pages: HanziItem[][];
  } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState("");
  const paperStackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setConfig((current) => ({ ...current, ...restoreConfig(readStoredJson(CONFIG_KEY)) }));
      setPinyinOverrides(restoreStringRecord(readStoredJson(PINYIN_KEY)));
      setRecords(restoreRecords(readStoredJson(RECORDS_KEY)));
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
    window.localStorage.setItem(PINYIN_KEY, JSON.stringify(pinyinOverrides));
  }, [hydrated, pinyinOverrides]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  }, [hydrated, records]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(hanziBankUrl(config.bankKey), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`bank data ${response.status}`);
        return response.json() as Promise<HanziBank>;
      })
      .then((nextBank) =>
        setBankResult({ bank: nextBank, error: "", key: config.bankKey }),
      )
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setBankResult({
          bank: null,
          error: "教材词库加载失败，请刷新后重试。",
          key: config.bankKey,
        });
      });
    return () => controller.abort();
  }, [config.bankKey]);

  const rawWords = useMemo(() => splitWords(config.source), [config.source]);
  const selectedWords = useMemo(
    () => filterHanziWords(rawWords, config.filter, records),
    [config.filter, rawWords, records],
  );
  const items = useMemo(
    () =>
      selectedWords.map((word) => ({
        pinyin: pinyinOverrides[word] || autoPinyin(word),
        word,
      })),
    [pinyinOverrides, selectedWords],
  );
  const neededStrokeChars = useMemo(() => {
    if (config.mode !== "trace" && config.mode !== "strokes") return [];
    return Array.from(new Set(selectedWords.flatMap((word) => chineseChars(word))));
  }, [config.mode, selectedWords]);
  const neededStrokeKey = neededStrokeChars.join("");

  useEffect(() => {
    let active = true;
    if (!neededStrokeChars.length) return undefined;
    Promise.all(
      neededStrokeChars.map(async (char) => [char, await loadStrokeData(char)] as const),
    ).then((entries) => {
      if (!active) return;
      setStrokeResult({ data: new Map(entries), key: neededStrokeKey });
    });
    return () => {
      active = false;
    };
  }, [neededStrokeChars, neededStrokeKey]);

  const bank = bankResult?.key === config.bankKey ? bankResult.bank : null;
  const bankError = bankResult?.key === config.bankKey ? bankResult.error : "";
  const bankLoading = bankResult?.key !== config.bankKey;
  const strokeData =
    neededStrokeKey && strokeResult?.key === neededStrokeKey ? strokeResult.data : new Map();
  const strokesLoading = Boolean(neededStrokeKey && strokeResult?.key !== neededStrokeKey);
  const paginationKey = useMemo(
    () =>
      [
        config.copies,
        config.dateText,
        config.gridType,
        config.mode,
        config.perPage,
        config.showMeta ? "meta" : "no-meta",
        config.title,
        neededStrokeKey && !strokesLoading ? `strokes:${neededStrokeKey}` : "strokes:loading",
        items.map((item) => `${item.word}:${item.pinyin}`).join("\u0001"),
      ].join("\u0002"),
    [
      config.copies,
      config.dateText,
      config.gridType,
      config.mode,
      config.perPage,
      config.showMeta,
      config.title,
      items,
      neededStrokeKey,
      strokesLoading,
    ],
  );
  const initialPages = useMemo(
    () => paginateHanziItems(items, config.perPage),
    [config.perPage, items],
  );
  const pages = paginationResult?.key === paginationKey ? paginationResult.pages : initialPages;

  useEffect(() => {
    const stack = paperStackRef.current;
    if (!stack) return;

    let frame = 0;
    const measure = () => {
      const paperElements = Array.from(
        stack.querySelectorAll<HTMLElement>(":scope > .hanzi-paper"),
      );
      if (paperElements.length !== pages.length) return;

      for (let pageIndex = 0; pageIndex < paperElements.length; pageIndex += 1) {
        const list = paperElements[pageIndex].querySelector<HTMLElement>(".hanzi-word-list");
        if (!list) continue;
        const listBottom = list.getBoundingClientRect().bottom;
        const itemElements = Array.from(list.querySelectorAll<HTMLElement>(":scope > .hanzi-item"));
        const overflowIndex = itemElements.findIndex(
          (element) => element.getBoundingClientRect().bottom > listBottom + 0.75,
        );
        if (overflowIndex > 0) {
          setPaginationResult({
            key: paginationKey,
            pages: moveHanziPageOverflow(
              pages,
              pageIndex,
              overflowIndex,
              config.perPage,
            ),
          });
          return;
        }
      }

      if (paginationResult?.key !== paginationKey) {
        setPaginationResult({ key: paginationKey, pages });
      }
    };
    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(stack);
    Array.from(stack.children).forEach((element) => observer.observe(element));
    scheduleMeasure();
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [config.perPage, pages, paginationKey, paginationResult?.key]);

  const updateConfig = <Key extends keyof HanziConfig>(
    key: Key,
    value: HanziConfig[Key],
  ) => setConfig((current) => ({ ...current, [key]: value }));

  const setWordStatus = (word: string, status: HanziWordStatus) => {
    setRecords((current) => {
      const next = { ...current };
      if (!status || current[word] === status) delete next[word];
      else next[word] = status;
      return next;
    });
  };

  const loadSelectedBank = () => {
    if (!bank || bankLoading) return;
    const words = wordsForBank(bank, config.unitKey);
    const unit = bank.units.find((item) => item.key === config.unitKey);
    if (rawWords.length && !window.confirm(`将替换当前 ${rawWords.length} 个字词，继续吗？`)) {
      return;
    }
    setPinyinOverrides({});
    setConfig((current) => ({
      ...current,
      source: words.join("\n"),
      title: unit
        ? `${bank.short} ${unit.name} 看拼音写汉字`
        : `${bank.name} 看拼音写汉字`,
    }));
    setNotice(`已加载${unit ? `“${unit.name}”` : "整册"}，共 ${words.length} 个字词。`);
  };

  const resetExample = () => {
    if (!window.confirm("恢复示例会替换当前汉字打印设置，继续吗？")) return;
    setConfig(defaultConfig);
    setPinyinOverrides({});
    setNotice("已恢复示例。");
  };

  const handlePrint = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.print());
    });
  };

  const activeBankManifest = HANZI_BANKS.find((item) => item.key === config.bankKey);
  const learningCount = Object.values(records).filter((status) => status === "learning").length;
  const masteredCount = Object.values(records).filter((status) => status === "mastered").length;

  return (
    <main className="app-shell hanzi-app-shell">
      <aside className="workbench">
        <header className="app-head">
          <div>
            <p className="app-kicker">GETWORD · CHINESE</p>
            <h1>汉字练习纸</h1>
          </div>
          <Link className="tool-switch" href="/">
            英语练习
          </Link>
        </header>

        <section className="control-section first-section">
          <label className="control-label" htmlFor="hanzi-source">
            中文字词列表
          </label>
          <textarea
            id="hanzi-source"
            onChange={(event) => updateConfig("source", event.target.value)}
            spellCheck={false}
            value={config.source}
          />
          <p className="control-hint">一行一个词；重复项会自动合并。</p>
        </section>

        <section className="control-section">
          <label className="control-label" htmlFor="hanzi-bank">
            内置词库（部编版参考）
          </label>
          <div className="hanzi-bank-grid">
            <select
              id="hanzi-bank"
              onChange={(event) => {
                const key = event.target.value;
                if (!isHanziBankKey(key)) return;
                setConfig((current) => ({ ...current, bankKey: key, unitKey: "" }));
                setNotice("");
              }}
              value={config.bankKey}
            >
              {HANZI_BANKS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              aria-label="教材单元"
              disabled={bankLoading || !bank}
              onChange={(event) => updateConfig("unitKey", event.target.value)}
              value={config.unitKey}
            >
              <option value="">整册全部</option>
              {bank?.units.map((unit) => (
                <option key={unit.key} value={unit.key}>
                  {unit.name}
                </option>
              ))}
            </select>
            <button
              className="button secondary"
              disabled={bankLoading || !bank}
              onClick={loadSelectedBank}
              type="button"
            >
              {bankLoading ? "加载中" : "载入"}
            </button>
          </div>
          <p className={bankError ? "control-hint error-text" : "control-hint"}>
            {bankError || notice || `${activeBankManifest?.name ?? "教材"}，加载后仍可增删字词。`}
          </p>
          {bank?.source ? (
            <p className="hanzi-bank-source">
              {bank.source.label} · {bank.source.edition}
            </p>
          ) : null}
        </section>

        <section className="control-section">
          <div className="form-grid two-columns">
            <div className="field">
              <label className="control-label" htmlFor="hanzi-title">
                标题
              </label>
              <input
                id="hanzi-title"
                onChange={(event) => updateConfig("title", event.target.value)}
                value={config.title}
              />
            </div>
            <div className="field">
              <label className="control-label" htmlFor="hanzi-date">
                日期
              </label>
              <input
                id="hanzi-date"
                onChange={(event) => updateConfig("dateText", event.target.value)}
                placeholder="可留空"
                value={config.dateText}
              />
            </div>
          </div>
        </section>

        <section className="control-section">
          <fieldset className="choice-fieldset">
            <legend className="control-label">练习模式</legend>
            <div className="choice-grid hanzi-mode-grid">
              {([
                ["write", "看拼音写汉字", "空格练习"],
                ["trace", "描红练习", "笔形描摹"],
                ["copy", "左范字右抄写", "观察后抄写"],
                ["dictation", "听写纸", "隐藏拼音"],
                ["strokes", "笔顺图", "逐笔展示"],
              ] as const).map(([value, label, hint]) => (
                <label className="choice-option" key={value}>
                  <input
                    checked={config.mode === value}
                    name="hanzi-mode"
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

          <div className="form-grid three-columns compact-grid">
            <div className="field">
              <label className="control-label" htmlFor="hanzi-grid-type">
                格子样式
              </label>
              <select
                id="hanzi-grid-type"
                onChange={(event) =>
                  updateConfig("gridType", event.target.value as HanziGridType)
                }
                value={config.gridType}
              >
                <option value="tian">田字格</option>
                <option value="mi">米字格</option>
                <option value="line">横线</option>
              </select>
            </div>
            <div className="field">
              <label className="control-label" htmlFor="hanzi-copies">
                每字空格
              </label>
              <select
                disabled={config.mode === "strokes"}
                id="hanzi-copies"
                onChange={(event) => updateConfig("copies", Number(event.target.value))}
                value={config.copies}
              >
                {[1, 2, 3, 4].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="control-label" htmlFor="hanzi-per-page">
                每页上限
              </label>
              <select
                disabled={config.mode === "strokes"}
                id="hanzi-per-page"
                onChange={(event) => updateConfig("perPage", Number(event.target.value))}
                value={config.perPage}
              >
                {[16, 24, 32, 40, 48].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid two-columns compact-grid">
            <div className="field">
              <label className="control-label" htmlFor="hanzi-filter">
                练习纸过滤
              </label>
              <select
                id="hanzi-filter"
                onChange={(event) =>
                  updateConfig("filter", event.target.value as HanziPrintFilter)
                }
                value={config.filter}
              >
                <option value="all">显示全部</option>
                <option value="hideMastered">隐藏已掌握</option>
                <option value="onlyLearning">只练生词本</option>
                <option value="onlyMastered">只复习已掌握</option>
              </select>
            </div>
            <label className="hanzi-meta-toggle">
              <input
                checked={config.showMeta}
                onChange={(event) => updateConfig("showMeta", event.target.checked)}
                type="checkbox"
              />
              <span>显示姓名和日期</span>
            </label>
          </div>
          <p className="control-hint">
            当前 {rawWords.length} 个字词 · 生词 {learningCount} · 已掌握 {masteredCount}
          </p>
        </section>

        <section className="control-section">
          <div className="section-heading-row">
            <span className="control-label">拼音校对与学习状态</span>
            <span className="entry-count">打印 {items.length} 条</span>
          </div>
          <div className="hanzi-pinyin-list">
            {items.length ? (
              items.map((item) => (
                <div className="hanzi-pinyin-row" key={item.word}>
                  <span className="hanzi-word-chip">{item.word}</span>
                  <input
                    aria-label={`${item.word} 的拼音`}
                    onChange={(event) =>
                      setPinyinOverrides((current) => ({
                        ...current,
                        [item.word]: event.target.value,
                      }))
                    }
                    value={item.pinyin}
                  />
                  <div className="hanzi-status-toggle">
                    {([
                      ["learning", "生词"],
                      ["mastered", "掌握"],
                    ] as const).map(([status, label]) => (
                      <button
                        aria-pressed={records[item.word] === status}
                        className={records[item.word] === status ? "active" : ""}
                        key={status}
                        onClick={() => setWordStatus(item.word, status)}
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="control-hint no-margin">当前过滤条件下没有可打印的字词。</p>
            )}
          </div>
        </section>

        <section className="control-section">
          <div className="hanzi-actions">
            <button
              className="button primary"
              disabled={!items.length || strokesLoading}
              onClick={handlePrint}
              type="button"
            >
              {strokesLoading ? "正在准备笔形…" : "打印 / 保存 PDF"}
            </button>
            <button className="button secondary" onClick={resetExample} type="button">
              重置示例
            </button>
          </div>
          <p className="control-hint">
            为获得准确 A4 排版，建议使用桌面版 Chrome、Edge 或 Safari。
          </p>
        </section>
      </aside>

      <section className="preview" aria-label="汉字练习纸 A4 预览">
        <div className="preview-toolbar">
          <div>
            <span className="preview-label">A4 预览</span>
            <span className="preview-summary">
              {items.length} 个字词 · {pages.length} 页
            </span>
          </div>
          <div className="zoom-control" role="group" aria-label="预览缩放">
            {([0.7, 0.85, 1] as const).map((zoom) => (
              <button
                aria-pressed={config.zoom === zoom}
                className={`zoom-button${config.zoom === zoom ? " active" : ""}`}
                key={zoom}
                onClick={() => updateConfig("zoom", zoom)}
                type="button"
              >
                {Math.round(zoom * 100)}
              </button>
            ))}
          </div>
        </div>

        <div className="paper-viewport">
          <div className="paper-stack" ref={paperStackRef} style={{ zoom: config.zoom }}>
            {pages.map((pageItems, pageIndex) => (
              <HanziPaper
                copies={config.copies}
                dateText={config.dateText}
                gridType={config.gridType}
                items={pageItems}
                key={pageIndex}
                mode={config.mode}
                showMeta={config.showMeta}
                startIndex={pages
                  .slice(0, pageIndex)
                  .reduce((total, page) => total + page.length, 0)}
                strokeData={strokeData}
                title={config.title}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
