"use client";

import { useEffect, useRef, useState } from "react";
import { contactDetails } from "@/data/contacts";
import type { SiteLocale } from "@/data/locales";
import { getUiText } from "@/data/ui-text";
import { LocaleTextTransition } from "./LocaleTextTransition";
import { trackContactIntent } from "./analytics";

export function EmailButton({
  locale,
  localeTextTransitionId,
}: {
  locale: SiteLocale;
  localeTextTransitionId: number;
}) {
  const text = getUiText(locale);
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
      await navigator.clipboard.writeText(contactDetails.email);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = contactDetails.email;
      textarea.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }

    setCopied(true);
    trackContactIntent("email", "navigation");
    timerRef.current = setTimeout(() => setCopied(false), 3000);
  }

  return (
    <>
      <button
        className="nav__link nav__copy"
        type="button"
        onClick={copyEmail}
        data-nav-item
        tabIndex={0}
      >
        <LocaleTextTransition transitionId={localeTextTransitionId}>
          {text.email}
        </LocaleTextTransition>
      </button>
      <div
        className={`nav__email-toast${copied ? " is-visible" : ""}`}
        role="status"
        aria-live="polite"
        aria-hidden={!copied}
      >
        <span>
          {contactDetails.email}
          <br />
          {text.copiedToClipboard}
        </span>
      </div>
    </>
  );
}
