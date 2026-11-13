"use client";

import { useState } from "react";

/** Gift card codes stay hidden until the owner chooses to reveal them. */
export default function CodeReveal({ code, pin }: { code: string; pin?: string | null }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable: the code is still visible to select manually */
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <code className="select-all break-all rounded-lg bg-surface-alt px-3 py-2 font-mono text-sm">
        {shown ? code : "•••• •••• •••• ••••"}
      </code>
      {shown && pin && <span className="text-xs text-ink-soft">PIN: <code className="font-mono">{pin}</code></span>}
      <button type="button" onClick={() => setShown((v) => !v)} className="text-sm font-semibold text-brand-700 hover:underline">
        {shown ? "Hide" : "Reveal"}
      </button>
      {shown && (
        <button type="button" onClick={copy} className="text-sm font-semibold text-brand-700 hover:underline">
          {copied ? "Copied" : "Copy"}
        </button>
      )}
    </div>
  );
}
