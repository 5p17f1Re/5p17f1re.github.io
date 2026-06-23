"use client";

import { useEffect, useRef, useState } from "react";

const EMAIL = "vsevolod.k@outlook.com";

export function EmailButton() {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  async function copyEmail() {
    if (timerRef.current) clearTimeout(timerRef.current);

    try {
      await navigator.clipboard.writeText(EMAIL);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = EMAIL;
      textarea.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }

    setCopied(true);
    timerRef.current = setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button
      className={`nav__link nav__copy${copied ? " is-copied" : ""}`}
      type="button"
      onClick={copyEmail}
      aria-live="polite"
    >
      {copied ? "Copied!" : "Email"}
    </button>
  );
}
