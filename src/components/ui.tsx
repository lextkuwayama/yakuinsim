"use client";

import { useEffect, useState, type ReactNode } from "react";
import { toolsTheme } from "@/lib/theme";

// 数値入力：入力途中の空欄を許容し（バックスペースで全消去できる）、先頭ゼロを自動除去する。
export function NumInput({
  value,
  onValueChange,
  min = 0,
  className,
  id,
  formatWithCommas = false,
}: {
  value: number;
  onValueChange: (n: number) => void;
  min?: number;
  className?: string;
  id?: string;
  formatWithCommas?: boolean;
}) {
  const formatValue = (n: number) => (formatWithCommas ? n.toLocaleString("ja-JP") : String(n));
  const parseValue = (s: string) => Number(s.replace(/,/g, ""));
  const [text, setText] = useState(formatValue(value));

  useEffect(() => {
    setText((prev) => (parseValue(prev) === value ? prev : formatValue(value)));
  }, [value, formatWithCommas]);

  return (
    <input
      id={id}
      type={formatWithCommas ? "text" : "number"}
      inputMode="numeric"
      pattern="[0-9,]*"
      autoComplete="off"
      enterKeyHint="done"
      min={min}
      value={text}
      onChange={(e) => {
        const cleaned = e.target.value.replace(/,/g, "").replace(/^0+(?=\d)/, "");
        setText(cleaned);
        if (cleaned === "") return;
        const n = parseValue(cleaned);
        if (!Number.isNaN(n)) onValueChange(n);
      }}
      onBlur={() => {
        const n = parseValue(text);
        if (text === "" || Number.isNaN(n)) {
          setText(formatValue(min));
          onValueChange(min);
        } else {
          setText(formatValue(n));
        }
      }}
      className={
        className ??
        "w-44 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      }
    />
  );
}

// 金額入力（万円単位で入力し、円で受け渡す）。小数1桁まで（例: 12.5万円）。
export function ManYenInput({
  value,
  onValueChange,
  id,
  className = "w-40",
  tone = "default",
}: {
  value: number;
  onValueChange: (yenValue: number) => void;
  id?: string;
  className?: string;
  tone?: "default" | "current";
}) {
  const toText = (yenValue: number) => {
    const man = yenValue / 10000;
    return Number.isInteger(man)
      ? man.toLocaleString("ja-JP")
      : man.toLocaleString("ja-JP", { maximumFractionDigits: 1 });
  };
  const parse = (s: string) => Number(s.replace(/,/g, ""));
  const [text, setText] = useState(toText(value));

  useEffect(() => {
    setText((prev) => (Math.round(parse(prev) * 10000) === value ? prev : toText(value)));
  }, [value]);

  const boxCls =
    tone === "current"
      ? "border-[var(--taxx-green-300)] bg-[var(--taxx-green-50)]"
      : "border-slate-300 bg-white";

  return (
    <div
      className={`flex items-center rounded-lg border shadow-sm focus-within:border-[var(--taxx-green-500)] focus-within:ring-2 focus-within:ring-[var(--taxx-green-200)] ${boxCls} ${className}`}
    >
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        enterKeyHint="done"
        value={text}
        onChange={(e) => {
          const cleaned = e.target.value
            .replace(/[，,]/g, "")
            .replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
            .replace(/[^0-9.]/g, "")
            .replace(/^0+(?=\d)/, "");
          setText(cleaned);
          if (cleaned === "" || cleaned === ".") return;
          const n = parse(cleaned);
          if (!Number.isNaN(n)) onValueChange(Math.round(n * 10000));
        }}
        onBlur={() => {
          const n = parse(text);
          if (text === "" || Number.isNaN(n)) {
            setText("0");
            onValueChange(0);
          } else {
            setText(toText(Math.round(n * 10000)));
          }
        }}
        className="w-full min-w-0 rounded-l-lg bg-transparent px-3 py-2 text-right text-sm font-bold tabular-nums text-slate-900 focus:outline-none"
      />
      <span className="shrink-0 pr-3 text-xs font-bold text-slate-500">万円</span>
    </div>
  );
}

// スライダーと万円入力欄を連動させる。入力欄では max を超える金額も入れられる。
export function ManYenSlider({
  id,
  label,
  hint,
  value,
  onValueChange,
  max,
  step,
}: {
  id: string;
  label: string;
  hint?: string;
  value: number;
  onValueChange: (yenValue: number) => void;
  max: number;
  step: number;
}) {
  const ticks = [0, max / 2, max];
  return (
    <div className="w-full rounded-lg bg-white px-4 py-3 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <label htmlFor={id} className="text-xs font-bold text-slate-700">
            {label}
          </label>
          {hint ? <div className="text-[10px] text-slate-400">{hint}</div> : null}
        </div>
        <ManYenInput id={id} value={value} onValueChange={onValueChange} className="w-36" />
      </div>
      <input
        type="range"
        aria-label={`${label}（スライダー）`}
        min={0}
        max={max}
        step={step}
        value={Math.min(value, max)}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className="mt-3 w-full cursor-pointer accent-[var(--taxx-green-600)]"
      />
      <div className="flex justify-between text-[10px] tabular-nums text-slate-400">
        {ticks.map((t) => (
          <span key={t}>{manYen(t)}</span>
        ))}
      </div>
    </div>
  );
}

export type ResultMetric = { label: string; value: string; sub?: string };

// 計算結果カード。ラベル付きの大きな数値ボックスを並べ、右側に内訳を添える。
export function ResultCard({
  metrics,
  breakdown,
  tone = "blue",
  placeholder = "上の値を入力すると自動で結果が表示されます。",
}: {
  metrics: ResultMetric[] | null;
  breakdown?: ReactNode;
  tone?: "blue" | "emerald" | "taxx" | "red";
  placeholder?: string;
}) {
  if (!metrics || metrics.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        {placeholder}
      </div>
    );
  }
  const toneCls =
    tone === "taxx" || tone === "emerald"
      ? `${toolsTheme.resultCard}`
      : tone === "red"
        ? "border-red-300 bg-red-50"
        : "border-blue-300 bg-blue-50";
  const valueCls =
    tone === "taxx" || tone === "emerald"
      ? toolsTheme.resultCardLabel
      : tone === "red"
        ? "text-red-700"
        : "text-blue-700";
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      {metrics.map((m, i) => (
        <div key={i} className={`rounded-xl border px-5 py-3 shadow-sm ${toneCls}`}>
          <div className="text-[11px] font-bold text-slate-500">{m.label}</div>
          <div className={`text-2xl font-black ${valueCls}`}>{m.value}</div>
          {m.sub ? <div className="text-[10px] font-medium text-slate-500">{m.sub}</div> : null}
        </div>
      ))}
      {breakdown ? <div className="text-xs text-slate-500">{breakdown}</div> : null}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5 text-xs font-bold text-slate-600">
      {label}
      {children}
      {hint ? <span className="text-[10px] font-medium text-slate-400">{hint}</span> : null}
    </label>
  );
}

/** 万円表記（例: 1,234.5万円）。結果の補足表示用。 */
export function manYen(n: number): string {
  const man = n / 10000;
  return `${man.toLocaleString("ja-JP", { maximumFractionDigits: 1 })}万円`;
}

export function yen(n: unknown): string {
  return `${Number(n).toLocaleString("ja-JP")}円`;
}

export function ratePct(n: unknown): string {
  const v = Number(n);
  if (Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(v * 100 === Math.round(v * 100) ? 0 : 1)}%`;
}
