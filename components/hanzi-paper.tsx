import type { CSSProperties } from "react";

import {
  chineseChars,
  splitItemPinyin,
  type HanziGridType,
  type HanziItem,
  type HanziMode,
} from "@/lib/hanzi";

export type HanziStrokeData = {
  medians?: number[][][];
  strokes: string[];
};

type HanziPaperProps = {
  copies: number;
  dateText: string;
  gridType: HanziGridType;
  items: HanziItem[];
  mode: HanziMode;
  pageNumber: number;
  pageTotal: number;
  perPage: number;
  showMeta: boolean;
  startIndex: number;
  strokeData: ReadonlyMap<string, HanziStrokeData | null>;
  title: string;
};

const modeLabels: Record<HanziMode, string> = {
  copy: "左范字右抄写",
  dictation: "听写练习",
  strokes: "汉字笔顺图",
  trace: "描红练习",
  write: "看拼音写汉字",
};

function StrokeGlyph({
  data,
  highlightIndex,
}: {
  data: HanziStrokeData;
  highlightIndex?: number;
}) {
  const lastIndex = highlightIndex ?? data.strokes.length - 1;
  const start = highlightIndex === undefined ? undefined : data.medians?.[highlightIndex]?.[0];

  return (
    <svg aria-hidden="true" className="hanzi-glyph" viewBox="0 0 1024 1024">
      <g transform="translate(0,900) scale(1,-1)">
        {data.strokes.slice(0, lastIndex + 1).map((path, index) => (
          <path
            className={index === highlightIndex ? "hanzi-new-stroke" : undefined}
            d={path}
            key={`${index}-${path.slice(0, 18)}`}
          />
        ))}
        {start ? (
          <circle
            className="hanzi-stroke-start"
            cx={start[0]}
            cy={start[1]}
            r="32"
          />
        ) : null}
      </g>
    </svg>
  );
}

function GridCell({
  char,
  data,
  gridType,
  highlightIndex,
  source = false,
  trace = false,
}: {
  char?: string;
  data?: HanziStrokeData | null;
  gridType: HanziGridType;
  highlightIndex?: number;
  source?: boolean;
  trace?: boolean;
}) {
  const className = [
    gridType === "line" ? "hanzi-line-cell" : "hanzi-cell",
    gridType === "mi" ? "mi" : "",
    source ? "source" : "",
    !char ? "blank" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={className}>
      {gridType === "mi" ? (
        <>
          <i className="hanzi-cell-diagonal forward" />
          <i className="hanzi-cell-diagonal back" />
        </>
      ) : null}
      {char ? (
        data && (trace || highlightIndex !== undefined) ? (
          <StrokeGlyph data={data} highlightIndex={highlightIndex} />
        ) : (
          <span className="hanzi-cell-text">{char}</span>
        )
      ) : null}
    </span>
  );
}

function PracticeGroup({
  copies,
  gridType,
  item,
  mode,
  strokeData,
}: {
  copies: number;
  gridType: HanziGridType;
  item: HanziItem;
  mode: HanziMode;
  strokeData: ReadonlyMap<string, HanziStrokeData | null>;
}) {
  const chars = chineseChars(item.word);
  const pinyinParts = splitItemPinyin(item);

  if (mode === "strokes") {
    return (
      <div className="hanzi-practice-grid strokes">
        {chars.map((char, charIndex) => {
          const data = strokeData.get(char);
          return (
            <div className="hanzi-char-unit stroke-unit" key={`${char}-${charIndex}`}>
              <div className="hanzi-char-pinyin">{pinyinParts[charIndex]}</div>
              <div className="hanzi-unit-cells">
                {data ? (
                  <>
                    <GridCell char={char} data={data} gridType={gridType} trace />
                    {data.strokes.map((_, strokeIndex) => (
                      <GridCell
                        char={char}
                        data={data}
                        gridType={gridType}
                        highlightIndex={strokeIndex}
                        key={strokeIndex}
                      />
                    ))}
                  </>
                ) : (
                  <GridCell char={char} gridType={gridType} source />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="hanzi-practice-grid">
      {chars.map((char, charIndex) => (
        <div className="hanzi-char-unit" key={`${char}-${charIndex}`}>
          <div className="hanzi-char-pinyin">
            {mode === "dictation" ? "" : pinyinParts[charIndex]}
          </div>
          <div className="hanzi-unit-cells">
            {mode === "copy" ? (
              <GridCell char={char} gridType={gridType} source />
            ) : null}
            {Array.from({ length: copies }, (_, copyIndex) => (
              <GridCell
                char={mode === "trace" ? char : undefined}
                data={strokeData.get(char)}
                gridType={gridType}
                key={copyIndex}
                trace={mode === "trace"}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function HanziPaper({
  copies,
  dateText,
  gridType,
  items,
  mode,
  pageNumber,
  pageTotal,
  perPage,
  showMeta,
  startIndex,
  strokeData,
  title,
}: HanziPaperProps) {
  const compactness = perPage >= 40 ? "dense" : perPage >= 24 ? "compact" : "roomy";
  const columnCount = perPage >= 24 ? 2 : 1;
  const pageStyle = {
    "--hanzi-row-count": Math.max(Math.ceil(items.length / columnCount), 1),
  } as CSSProperties;

  return (
    <article className={`paper hanzi-paper ${compactness}`} style={pageStyle}>
      <header className="paper-head">
        <div>
          <div className="paper-kicker">{modeLabels[mode]}</div>
          <h2>{title || "看拼音写汉字"}</h2>
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

      <div className="hanzi-word-list">
        {items.length ? (
          items.map((item, index) => (
            <section className="hanzi-item" key={`${item.word}-${index}`}>
              <span className="hanzi-index">{startIndex + index + 1}.</span>
              <PracticeGroup
                copies={copies}
                gridType={gridType}
                item={item}
                mode={mode}
                strokeData={strokeData}
              />
            </section>
          ))
        ) : (
          <p className="paper-empty">请输入中文字词，或从教材词库加载一个单元。</p>
        )}
      </div>

      <footer className="paper-footer">
        <span>{modeLabels[mode]}</span>
        <span>
          第 {pageNumber} / {pageTotal} 页
        </span>
      </footer>
    </article>
  );
}
