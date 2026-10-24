"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { getPlaygroundPaths } from "@/data/playground-path";

const closeDuration = 240;

function playgroundIsOpen(caseSlug: string) {
  return getPlaygroundPaths(window.location.pathname, caseSlug)?.isOpen ?? false;
}

export function CasePlayground({
  caseSlug,
  teaserDescription,
  teaserArtwork,
  children,
}: {
  caseSlug: string;
  teaserDescription: string;
  teaserArtwork: ReactNode;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(
    () => typeof window !== "undefined" && playgroundIsOpen(caseSlug),
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const scrollYRef = useRef(0);
  const bodyStyleRef = useRef({ position: "", top: "", width: "" });
  const bodyLockedRef = useRef(false);
  const scrollRestorationRef = useRef<History["scrollRestoration"] | null>(null);

  const unlockBody = useCallback(() => {
    if (!bodyLockedRef.current) return;
    const body = document.body;
    body.style.position = bodyStyleRef.current.position;
    body.style.top = bodyStyleRef.current.top;
    body.style.width = bodyStyleRef.current.width;
    bodyLockedRef.current = false;
    window.scrollTo({ left: 0, top: scrollYRef.current, behavior: "instant" });
    if (scrollRestorationRef.current !== null) {
      window.history.scrollRestoration = scrollRestorationRef.current;
      scrollRestorationRef.current = null;
    }
  }, []);

  const syncFromUrl = useCallback(
    () => setIsOpen(playgroundIsOpen(caseSlug)),
    [caseSlug],
  );

  useEffect(() => {
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [syncFromUrl]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (isOpen) {
      if (!dialog.open) {
        scrollYRef.current = window.scrollY;
        scrollRestorationRef.current = window.history.scrollRestoration;
        window.history.scrollRestoration = "manual";
        bodyStyleRef.current = {
          position: document.body.style.position,
          top: document.body.style.top,
          width: document.body.style.width,
        };
        document.body.style.position = "fixed";
        document.body.style.top = `-${scrollYRef.current}px`;
        document.body.style.width = "100%";
        bodyLockedRef.current = true;
        dialog.showModal();
        scrollRef.current?.scrollTo(0, 0);
      }
      dialog.dataset.state = "opening";
      const frame = window.requestAnimationFrame(() => {
        dialog.dataset.state = "open";
        closeButtonRef.current?.focus({ preventScroll: true });
      });
      return () => window.cancelAnimationFrame(frame);
    }

    if (dialog.open) {
      dialog.dataset.state = "closing";
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      closeTimerRef.current = window.setTimeout(() => {
        dialog.close();
        dialog.dataset.state = "closed";
        unlockBody();
        triggerRef.current?.focus({ preventScroll: true });
        closeTimerRef.current = null;
      }, reducedMotion ? 0 : closeDuration);
    }
  }, [isOpen, unlockBody]);

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
      if (dialog?.open) dialog.close();
      unlockBody();
    };
  }, [unlockBody]);

  function openPlayground() {
    const url = new URL(window.location.href);
    const paths = getPlaygroundPaths(url.pathname, caseSlug);
    if (!paths || paths.isOpen) return;
    url.pathname = paths.playgroundPath;
    window.history.pushState(
      { casePlayground: caseSlug },
      "",
      url,
    );
    setIsOpen(true);
  }

  function closePlayground() {
    const url = new URL(window.location.href);
    const paths = getPlaygroundPaths(url.pathname, caseSlug);
    if (!paths?.isOpen) return;
    if (window.history.state?.casePlayground === caseSlug) {
      window.history.back();
      return;
    }
    url.pathname = paths.casePath;
    window.history.replaceState(null, "", url);
    setIsOpen(false);
  }

  return (
    <section className="case-playground" aria-label="Playground">
      <div className="case-playground__teaser">
        <div className="case-playground__teaser-copy">
          <h2>Playground</h2>
          <p>{teaserDescription}</p>
          <button
            ref={triggerRef}
            className="case-playground__trigger"
            type="button"
            aria-haspopup="dialog"
            aria-controls={`${caseSlug}-playground`}
            onClick={openPlayground}
          >
            Open Playground <span aria-hidden="true">↗</span>
          </button>
        </div>
        <div className="case-playground__teaser-art">
          {teaserArtwork}
        </div>
      </div>

      <dialog
        ref={dialogRef}
        id={`${caseSlug}-playground`}
        className="case-playground__dialog"
        aria-labelledby={`${caseSlug}-playground-title`}
        onCancel={(event) => {
          event.preventDefault();
          closePlayground();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) closePlayground();
        }}
      >
        <button
          ref={closeButtonRef}
          className="case-playground__close"
          type="button"
          aria-label="Закрыть Playground"
          onClick={closePlayground}
        >
          <span aria-hidden="true">×</span>
        </button>
        <div ref={scrollRef} className="case-playground__scroll" lang="ru">
          <header className="case-playground__header">
            <h2 id={`${caseSlug}-playground-title`}>Playground</h2>
          </header>
          {children}
        </div>
      </dialog>
    </section>
  );
}
