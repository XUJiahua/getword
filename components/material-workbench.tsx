"use client";

import { useMemo, useState } from "react";

import type { WordBank } from "@/lib/banks";
import {
  parseLooseWordEntries,
  parseWordEntries,
  serializeEntries,
  type WordEntry,
} from "@/lib/worksheet";

type MaterialTab = "banks" | "paste" | "table" | "raw";

type MaterialWorkbenchProps = {
  bankKey: string;
  banks: WordBank[];
  entries: WordEntry[];
  invalidLines: number[];
  onBankKeyChange: (key: string) => void;
  onLoadBank: (bank: WordBank, entries: WordEntry[]) => void;
  onSourceChange: (source: string) => void;
  source: string;
};

type DraftState = {
  entries: WordEntry[];
  source: string;
};

const materialTabs: ReadonlyArray<{ label: string; value: MaterialTab }> = [
  { value: "banks", label: "内置词库" },
  { value: "paste", label: "智能粘贴" },
  { value: "table", label: "表格编辑" },
  { value: "raw", label: "高级文本" },
];

function isCompleteEntry(entry: WordEntry): boolean {
  return Boolean(entry.chinese.trim() && entry.english.trim());
}

function EditableEntryList({
  entries,
  onSourceChange,
  source,
}: {
  entries: WordEntry[];
  onSourceChange: (source: string) => void;
  source: string;
}) {
  const [draftState, setDraftState] = useState<DraftState>(() => ({
    entries: entries.map((entry) => ({ ...entry })),
    source,
  }));
  const draftEntries =
    draftState.source === source
      ? draftState.entries
      : entries.map((entry) => ({ ...entry }));
  const incompleteCount = draftEntries.filter((entry) => !isCompleteEntry(entry)).length;

  const publish = (nextEntries: WordEntry[]) => {
    const nextSource = serializeEntries(nextEntries.filter(isCompleteEntry));
    setDraftState({ entries: nextEntries, source: nextSource });
    if (nextSource !== source) onSourceChange(nextSource);
  };

  const updateEntry = (
    id: string,
    field: "chinese" | "english" | "partOfSpeech" | "example",
    value: string,
  ) => {
    const nextValue = field === "chinese" || field === "english" ? value : value || undefined;
    publish(
      draftEntries.map((entry) =>
        entry.id === id ? { ...entry, [field]: nextValue } : entry,
      ),
    );
  };

  const addEntry = () => {
    const id = `draft-${Date.now().toString(36)}`;
    setDraftState({
      entries: [...draftEntries, { chinese: "", english: "", id }],
      source,
    });
  };

  const removeEntry = (id: string) => {
    publish(draftEntries.filter((entry) => entry.id !== id));
  };

  return (
    <div>
      <div className="entry-editor-toolbar">
        <p className="control-hint no-margin">
          中文和英文必填；词性与例句可留空。
          {incompleteCount ? ` 还有 ${incompleteCount} 行尚未完成。` : ""}
        </p>
        <button className="button secondary" onClick={addEntry} type="button">
          新增一行
        </button>
      </div>
      <div className="entry-editor-list">
        {draftEntries.map((entry, index) => (
          <div
            className={`entry-editor-row${isCompleteEntry(entry) ? "" : " incomplete"}`}
            key={entry.id}
          >
            <span className="entry-editor-index">{index + 1}</span>
            <input
              aria-label={`第 ${index + 1} 行中文`}
              onChange={(event) => updateEntry(entry.id, "chinese", event.target.value)}
              placeholder="中文释义 *"
              value={entry.chinese}
            />
            <input
              aria-label={`第 ${index + 1} 行英文`}
              onChange={(event) => updateEntry(entry.id, "english", event.target.value)}
              placeholder="英文 *"
              spellCheck={false}
              value={entry.english}
            />
            <button
              aria-label={`删除第 ${index + 1} 行`}
              className="entry-delete-button"
              onClick={() => removeEntry(entry.id)}
              type="button"
            >
              ×
            </button>
            <input
              aria-label={`第 ${index + 1} 行词性`}
              className="entry-editor-pos"
              onChange={(event) => updateEntry(entry.id, "partOfSpeech", event.target.value)}
              placeholder="词性（选填）"
              value={entry.partOfSpeech ?? ""}
            />
            <input
              aria-label={`第 ${index + 1} 行例句`}
              className="entry-editor-example"
              onChange={(event) => updateEntry(entry.id, "example", event.target.value)}
              placeholder="例句（选填，用 ____ 表示填空）"
              spellCheck={false}
              value={entry.example ?? ""}
            />
          </div>
        ))}
        {!draftEntries.length ? (
          <p className="empty-control">暂无词条，点击“新增一行”开始填写。</p>
        ) : null}
      </div>
    </div>
  );
}

export function MaterialWorkbench({
  bankKey,
  banks,
  entries,
  invalidLines,
  onBankKeyChange,
  onLoadBank,
  onSourceChange,
  source,
}: MaterialWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<MaterialTab>("banks");
  const [pasteSource, setPasteSource] = useState("");
  const [selection, setSelection] = useState<{ bankKey: string; ids: Set<string> } | null>(null);
  const [message, setMessage] = useState("");
  const activeBank = banks.find((bank) => bank.key === bankKey) ?? banks[0];
  const selectedIds =
    selection?.bankKey === activeBank.key
      ? selection.ids
      : new Set(activeBank.entries.map((entry) => entry.id));
  const pasteResult = useMemo(() => parseLooseWordEntries(pasteSource), [pasteSource]);

  const selectBank = (nextKey: string) => {
    const nextBank = banks.find((bank) => bank.key === nextKey) ?? banks[0];
    onBankKeyChange(nextBank.key);
    setSelection({
      bankKey: nextBank.key,
      ids: new Set(nextBank.entries.map((entry) => entry.id)),
    });
    setMessage("");
  };

  const toggleBankEntry = (id: string) => {
    const nextIds = new Set(selectedIds);
    if (nextIds.has(id)) nextIds.delete(id);
    else nextIds.add(id);
    setSelection({ bankKey: activeBank.key, ids: nextIds });
  };

  const loadBank = () => {
    const selectedEntries = activeBank.entries.filter((entry) => selectedIds.has(entry.id));
    if (!selectedEntries.length) return;
    onLoadBank(activeBank, selectedEntries);
    setMessage(`已载入 ${selectedEntries.length} 个词条，可继续校对。`);
    setActiveTab("table");
  };

  const importPaste = (mode: "append" | "replace") => {
    if (!pasteResult.entries.length) return;
    const importedSource = serializeEntries(pasteResult.entries);
    const nextEntries =
      mode === "append"
        ? parseWordEntries(`${serializeEntries(entries)}\n${importedSource}`).entries
        : pasteResult.entries;
    const added = nextEntries.length - (mode === "append" ? entries.length : 0);
    onSourceChange(serializeEntries(nextEntries));
    setMessage(
      mode === "append"
        ? `已追加 ${Math.max(added, 0)} 个不重复词条。`
        : `已用 ${nextEntries.length} 个词条替换当前素材。`,
    );
    setActiveTab("table");
  };

  return (
    <section className="control-section first-section material-workbench">
      <div className="section-heading-row">
        <div>
          <h2 className="control-label">练习素材</h2>
          <p className="control-hint no-margin">选择、粘贴或直接编辑，不必手写固定格式。</p>
        </div>
        <span className="entry-count">有效 {entries.length} 条</span>
      </div>

      <div aria-label="素材录入方式" className="material-tabs" role="tablist">
        {materialTabs.map((tab) => (
          <button
            aria-selected={activeTab === tab.value}
            className={activeTab === tab.value ? "active" : ""}
            key={tab.value}
            onClick={() => {
              setActiveTab(tab.value);
              setMessage("");
            }}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "banks" ? (
        <div className="material-panel" role="tabpanel">
          <div className="bank-row">
            <select
              aria-label="内置词库"
              onChange={(event) => selectBank(event.target.value)}
              value={activeBank.key}
            >
              {banks.map((bank) => (
                <option key={bank.key} value={bank.key}>
                  {bank.name}
                </option>
              ))}
            </select>
            <button
              className="button primary"
              disabled={!selectedIds.size}
              onClick={loadBank}
              type="button"
            >
              载入所选
            </button>
          </div>
          <p className="control-hint">{activeBank.description}</p>
          <div className="bank-selection-toolbar">
            <span>已选 {selectedIds.size}/{activeBank.entries.length}</span>
            <div>
              <button
                className="text-button inline-text-button"
                onClick={() =>
                  setSelection({
                    bankKey: activeBank.key,
                    ids: new Set(activeBank.entries.map((entry) => entry.id)),
                  })
                }
                type="button"
              >
                全选
              </button>
              <button
                className="text-button muted-text-button inline-text-button"
                onClick={() => setSelection({ bankKey: activeBank.key, ids: new Set() })}
                type="button"
              >
                清空
              </button>
            </div>
          </div>
          <div className="bank-entry-picker">
            {activeBank.entries.map((entry) => (
              <label key={entry.id}>
                <input
                  checked={selectedIds.has(entry.id)}
                  onChange={() => toggleBankEntry(entry.id)}
                  type="checkbox"
                />
                <span>{entry.chinese}</span>
                <small>{entry.english}</small>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "paste" ? (
        <div className="material-panel" role="tabpanel">
          <textarea
            aria-label="智能粘贴词条"
            onChange={(event) => setPasteSource(event.target.value)}
            placeholder={"1. apple 苹果\n香蕉 | banana | n.\nwatch TV - 看电视"}
            spellCheck={false}
            value={pasteSource}
          />
          <div className="paste-summary">
            <span>识别 {pasteResult.entries.length} 条</span>
            <span>重复 {pasteResult.duplicateLines.length} 条</span>
            <span className={pasteResult.invalidLines.length ? "error-text" : ""}>
              未识别 {pasteResult.invalidLines.length} 条
            </span>
          </div>
          {pasteResult.invalidLines.length ? (
            <p className="control-hint error-text">
              请检查第 {pasteResult.invalidLines.join("、")} 行；未识别内容不会导入。
            </p>
          ) : null}
          {pasteResult.entries.length ? (
            <div className="paste-preview">
              {pasteResult.entries.slice(0, 6).map((entry) => (
                <div key={entry.id}>
                  <span>{entry.chinese}</span>
                  <b>{entry.english}</b>
                  <small>{entry.partOfSpeech ?? ""}</small>
                </div>
              ))}
              {pasteResult.entries.length > 6 ? (
                <p>另有 {pasteResult.entries.length - 6} 条将在导入后显示。</p>
              ) : null}
            </div>
          ) : null}
          <div className="material-actions">
            <button
              className="button secondary"
              disabled={!pasteResult.entries.length}
              onClick={() => importPaste("append")}
              type="button"
            >
              追加到当前
            </button>
            <button
              className="button primary"
              disabled={!pasteResult.entries.length}
              onClick={() => importPaste("replace")}
              type="button"
            >
              替换并校对
            </button>
          </div>
        </div>
      ) : null}

      {activeTab === "table" ? (
        <div className="material-panel" role="tabpanel">
          <EditableEntryList
            entries={entries}
            onSourceChange={onSourceChange}
            source={source}
          />
        </div>
      ) : null}

      {activeTab === "raw" ? (
        <div className="material-panel" role="tabpanel">
          <textarea
            aria-label="原始词条文本"
            onChange={(event) => onSourceChange(event.target.value)}
            placeholder="苹果 | apple | n. | I eat an ____."
            spellCheck={false}
            value={source}
          />
          <p className={invalidLines.length ? "control-hint error-text" : "control-hint"}>
            每行格式：中文 | 英文 | 词性 | 例句。也支持 Tab 或等号分隔。
            {invalidLines.length ? ` 第 ${invalidLines.join("、")} 行未识别，已跳过。` : ""}
          </p>
        </div>
      ) : null}

      {message ? <p className="operation-notice">{message}</p> : null}
    </section>
  );
}
