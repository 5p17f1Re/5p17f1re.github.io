"use client";

import Link from "next/link";
import {
  type CSSProperties,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { NotFoundTracker } from "./NotFoundTracker";

export function NotFoundPage() {
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [isCursorVisible, setIsCursorVisible] = useState(false);
  const cursorPositionRef = useRef<{ x: number; y: number } | null>(null);
  const cursorTargetRef = useRef<{ x: number; y: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  function stopCursorAnimation() {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }

  function animateCursor() {
    const position = cursorPositionRef.current;
    const target = cursorTargetRef.current;
    if (!position || !target) return;

    position.x += (target.x - position.x) * 0.25;
    position.y += (target.y - position.y) * 0.25;
    setCursor({ ...position });
    animationFrameRef.current = requestAnimationFrame(animateCursor);
  }

  useEffect(() => stopCursorAnimation, []);

  function moveCursor(event: PointerEvent<HTMLAnchorElement>) {
    if (event.pointerType !== "mouse") return;
    setIsCursorVisible(true);
    cursorTargetRef.current = { x: event.clientX, y: event.clientY };
    if (!cursorPositionRef.current) {
      cursorPositionRef.current = { ...cursorTargetRef.current };
    }
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(animateCursor);
    }
  }

  return (
    <main id="main-content" className="not-found-page">
      <NotFoundTracker />
      <Link
        className="not-found-page__desktop-link"
        href="/"
        aria-label="Back to Index"
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setIsCursorVisible(true);
        }}
        onPointerMove={moveCursor}
        onPointerLeave={() => {
          setIsCursorVisible(false);
          stopCursorAnimation();
        }}
      >
        <span className="not-found-page__content">
          <h1>Page not found</h1>
          <p>The page may have moved, or the link may be out of date.</p>
        </span>
        <span
          className="not-found-page__cursor"
          aria-hidden="true"
          data-visible={isCursorVisible}
          style={{
            "--not-found-cursor-x": `${cursor.x}px`,
            "--not-found-cursor-y": `${cursor.y}px`,
          } as CSSProperties}
        >
          Back to Index
        </span>
      </Link>

      <section className="not-found-page__mobile-content">
        <h1>Page not found</h1>
        <p>The page may have moved, or the link may be out of date.</p>
        <Link className="not-found-page__button" href="/">
          Back to Index
        </Link>
      </section>
    </main>
  );
}
