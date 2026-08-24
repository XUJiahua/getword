import type { CSSProperties } from "react";

import {
  maskEnglishWord,
  type LineStyle,
  type PracticeMode,
  type WordEntry,
} from "@/lib/worksheet";

type PaperProps = {
  entries: WordEntry[];
  title: string;
  dateText: string;
  lineStyle: LineStyle;
  mode: PracticeMode;
  pageNumber: number;
  pageTotal: number;
  perPage: number;
  showMeta: boolean;
  startIndex: number;
};

const modeCopy: Record<PracticeMode, { label: string; instruction: string }> = {
  recall: {
    label: "中文写英文",
    instruction: "根据中文释义写出英文。完成后再翻到答案页核对。",
  },
  hint: {
    label: "首字母提示",
    instruction: "根据中文和首字母提示补全英文。带提示的正确答案仍需要后续复习。",
  },
  dictation: {
    label: "英文听写",
    instruction: "请家长或老师按答案页顺序朗读，每个词可重复一次。",
  },
};

function WritingGuide({ hint, lineStyle }: { hint?: string; lineStyle: LineStyle }) {
  if (lineStyle === "four-line") {
    return (
      <div className="writing-guide four-line-guide" aria-label="四线三格书写区">
        <i />
        <i />
        <i />
        <i />
        {hint ? <span>{hint}</span> : null}
      </div>
    );
  }

  return (
    <div className="writing-guide ruled-guide" aria-label="横线书写区">
      {hint ? <span>{hint}</span> : null}
    </div>
  );
}

function PaperHeader({
  dateText,
  label,
  showMeta,
  title,
}: {
  dateText: string;
  label: string;
  showMeta: boolean;
  title: string;
}) {
  return (
    <header className="paper-head">
      <div>
        <div className="paper-kicker">{label}</div>
        <h2>{title || "英语词汇练习"}</h2>
      </div>
      {showMeta ? (
        <div className="paper-meta">
          <span>
            姓名 <b />
          </span>
          <span>
            日期 <b>{dateText}</b>
          </span>
        </div>
      ) : null}
    </header>
  );
}

export function StudentPaper({
  entries,
  title,
  dateText,
  lineStyle,
  mode,
  pageNumber,
  pageTotal,
  perPage,
  showMeta,
  startIndex,
}: PaperProps) {
  const rowStyle = { "--paper-rows": perPage } as CSSProperties;

  return (
    <article className="paper student-paper">
      <PaperHeader
        dateText={dateText}
        label={modeCopy[mode].label}
        showMeta={showMeta}
        title={title}
      />
      <p className="paper-instruction">{modeCopy[mode].instruction}</p>

      <div className="practice-list" style={rowStyle}>
        {entries.length ? (
          entries.map((entry, index) => {
            const number = startIndex + index + 1;
            const hint = mode === "hint" ? maskEnglishWord(entry.english) : undefined;
            return (
              <section className="practice-row" key={entry.id}>
                <div className="row-number">{number}.</div>
                <div className="word-prompt">
                  {mode === "dictation" ? (
                    <span className="dictation-prompt">听写</span>
                  ) : (
                    <>
                      <div className="prompt-main">
                        {entry.chinese}
                        {entry.partOfSpeech ? <small>{entry.partOfSpeech}</small> : null}
                      </div>
                      {entry.example ? <div className="prompt-example">{entry.example}</div> : null}
                    </>
                  )}
                </div>
                <WritingGuide hint={hint} lineStyle={lineStyle} />
                <div className="self-check" aria-label="自评">
                  <span>□ 对</span>
                  <span>□ 疑</span>
                  <span>□ 错</span>
                </div>
              </section>
            );
          })
        ) : (
          <div className="paper-empty">当前没有可打印的词条，请返回工作台调整词条或筛选条件。</div>
        )}
      </div>

      <footer className="paper-footer">
        <span>完成后将“疑”和“错”的词加入生词本</span>
        <span>
          学生页 {pageNumber}/{pageTotal}
        </span>
      </footer>
    </article>
  );
}

export function AnswerPaper({
  entries,
  title,
  dateText,
  mode,
  pageNumber,
  pageTotal,
  perPage,
  showMeta,
  startIndex,
}: Omit<PaperProps, "lineStyle">) {
  const rowStyle = { "--paper-rows": perPage } as CSSProperties;
  const instruction =
    mode === "dictation"
      ? "朗读英文，不要读中文。先按顺序读一遍，再按需要重复。"
      : "核对拼写时请留意空格、连字符和大小写。合理的其他译法不应判错。";

  return (
    <article className="paper answer-paper">
      <PaperHeader
        dateText={dateText}
        label={mode === "dictation" ? "家长朗读与答案" : "参考答案"}
        showMeta={showMeta}
        title={title}
      />
      <p className="paper-instruction">{instruction}</p>

      <div className="answer-list" style={rowStyle}>
        {entries.map((entry, index) => (
          <section className="answer-row" key={entry.id}>
            <div className="row-number">{startIndex + index + 1}.</div>
            <div className="answer-cue">
              <span>{entry.chinese}</span>
              {entry.partOfSpeech ? <small>{entry.partOfSpeech}</small> : null}
            </div>
            <div className="answer-word">{entry.english}</div>
            <div className="answer-example">{entry.example || ""}</div>
          </section>
        ))}
      </div>

      <footer className="paper-footer">
        <span>核对后只需回录“疑”和“错”</span>
        <span>
          答案页 {pageNumber}/{pageTotal}
        </span>
      </footer>
    </article>
  );
}
