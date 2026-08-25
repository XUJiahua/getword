"use client";

import { useRef } from "react";

import {
  getSessionResultCounts,
  type PracticeSession,
  type WordBook,
} from "@/lib/study-data";
import type { PracticeResult } from "@/lib/progress";

type Notice = { kind: "error" | "success"; message: string } | null;

export function WordBookSection({
  activeId,
  books,
  name,
  notice,
  onLoad,
  onMerge,
  onNameChange,
  onRemove,
  onSave,
  onSelect,
  selectedId,
}: {
  activeId: string;
  books: WordBook[];
  name: string;
  notice: Notice;
  onLoad: () => void;
  onMerge: () => void;
  onNameChange: (value: string) => void;
  onRemove: () => void;
  onSave: () => void;
  onSelect: (value: string) => void;
  selectedId: string;
}) {
  const hasSelection = books.some((book) => book.id === selectedId);

  return (
    <section className="control-section">
      <div className="section-heading-row">
        <div>
          <h2 className="control-label">我的词库</h2>
          <p className="control-hint no-margin">保存教材单元或复习专题，可随时载入或合并。</p>
        </div>
        <span className="entry-count">{books.length} 本</span>
      </div>

      <div className="bank-row spaced-row">
        <select
          aria-label="已保存词库"
          onChange={(event) => onSelect(event.target.value)}
          value={selectedId}
        >
          <option value="">新词库</option>
          {books.map((book) => (
            <option key={book.id} value={book.id}>
              {book.name}
            </option>
          ))}
        </select>
        <button className="button secondary" disabled={!hasSelection} onClick={onLoad} type="button">
          载入
        </button>
      </div>

      <div className="bank-row spaced-row">
        <input
          aria-label="词库名称"
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="例如：五上 Unit 1"
          value={name}
        />
        <button className="button secondary" onClick={onSave} type="button">
          {books.some((book) => book.id === activeId) ? "更新" : "保存"}
        </button>
      </div>

      <div className="compact-actions">
        <button className="text-button inline-text-button" disabled={!hasSelection} onClick={onMerge} type="button">
          追加到当前
        </button>
        <button className="text-button inline-text-button muted-text-button" disabled={!hasSelection} onClick={onRemove} type="button">
          移除词库
        </button>
      </div>
      {notice ? (
        <p className={`operation-notice ${notice.kind}`} role="status">
          {notice.message}
        </p>
      ) : null}
    </section>
  );
}

function formatSessionDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
  }).format(new Date(value));
}

const resultOptions: ReadonlyArray<{ label: string; value: PracticeResult }> = [
  { label: "对", value: "correct" },
  { label: "疑", value: "unsure" },
  { label: "错", value: "wrong" },
];

export function SessionReviewSection({
  onRemove,
  onResult,
  onSelect,
  selectedId,
  sessions,
}: {
  onRemove: () => void;
  onResult: (entryId: string, result: PracticeResult) => void;
  onSelect: (value: string) => void;
  selectedId: string;
  sessions: PracticeSession[];
}) {
  const session = sessions.find((item) => item.id === selectedId) ?? sessions[0];
  const counts = session ? getSessionResultCounts(session) : null;

  return (
    <section className="control-section">
      <div className="section-heading-row">
        <div>
          <h2 className="control-label">打印结果回录</h2>
          <p className="control-hint no-margin">按纸面顺序录入“对、疑、错”，学习进度会同步更新。</p>
        </div>
        {session ? (
          <button className="text-button muted-text-button" onClick={onRemove} type="button">
            删除批次
          </button>
        ) : null}
      </div>

      {session ? (
        <>
          <select
            aria-label="打印批次"
            className="spaced-row"
            onChange={(event) => onSelect(event.target.value)}
            value={session.id}
          >
            {sessions.map((item) => (
              <option key={item.id} value={item.id}>
                {formatSessionDate(item.createdAt)} · {item.code} · {item.entries.length} 词
                {item.variantCount > 1 ? ` · ${item.variantCount} 版` : ""}
              </option>
            ))}
          </select>
          <div className="progress-summary session-summary" aria-label="本批次回录进度">
            <span>未录 {counts?.unmarked ?? 0}</span>
            <span>对 {counts?.correct ?? 0}</span>
            <span>疑 {counts?.unsure ?? 0}</span>
            <span>错 {counts?.wrong ?? 0}</span>
          </div>
          <div className="session-review-list">
            {session.entries.map((entry, index) => (
              <div className="session-review-row" key={entry.id}>
                <span className="entry-index">{index + 1}</span>
                <span className="session-word">
                  <b>{entry.chinese}</b>
                  <small>{entry.english}</small>
                </span>
                <div className="result-buttons" aria-label={`${entry.chinese}：练习结果`}>
                  {resultOptions.map((option) => (
                    <button
                      aria-pressed={session.results[entry.id] === option.value}
                      className={session.results[entry.id] === option.value ? "result-button active" : "result-button"}
                      key={option.value}
                      onClick={() => onResult(entry.id, option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="empty-control compact-empty">打印一次练习纸后，可在这里快速回录结果。</p>
      )}
    </section>
  );
}

export function DataTransferSection({
  notice,
  onExportBackup,
  onExportCsv,
  onImportBackup,
  onImportCsv,
}: {
  notice: Notice;
  onExportBackup: () => void;
  onExportCsv: () => void;
  onImportBackup: (file: File) => void | Promise<void>;
  onImportCsv: (file: File) => void | Promise<void>;
}) {
  const backupInput = useRef<HTMLInputElement>(null);
  const csvInput = useRef<HTMLInputElement>(null);

  return (
    <section className="control-section">
      <h2 className="control-label">数据导入与备份</h2>
      <p className="control-hint no-margin">JSON 保存全部本地数据，CSV 用于交换当前词库。</p>
      <div className="transfer-grid">
        <button className="button secondary" onClick={onExportBackup} type="button">导出完整备份</button>
        <button className="button secondary" onClick={() => backupInput.current?.click()} type="button">导入完整备份</button>
        <button className="button secondary" onClick={onExportCsv} type="button">导出当前 CSV</button>
        <button className="button secondary" onClick={() => csvInput.current?.click()} type="button">导入当前 CSV</button>
      </div>
      <input
        accept=".json,application/json"
        className="visually-hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onImportBackup(file);
          event.target.value = "";
        }}
        ref={backupInput}
        type="file"
      />
      <input
        accept=".csv,text/csv"
        className="visually-hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onImportCsv(file);
          event.target.value = "";
        }}
        ref={csvInput}
        type="file"
      />
      {notice ? (
        <p className={`operation-notice ${notice.kind}`} role="status">
          {notice.message}
        </p>
      ) : null}
    </section>
  );
}
