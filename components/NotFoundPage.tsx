"use client";

import Link from "next/link";
import { useReducedMotion } from "motion/react";
import {
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { stepZeroBounceSpring } from "@/lib/zero-bounce-spring";
import { NotFoundTracker } from "./NotFoundTracker";

export function NotFoundPage() {
  const [isCursorVisible, setIsCursorVisible] = useState(false);
  const reduceMotion = useReducedMotion();
  const cursorRef = useRef<HTMLSpanElement>(null);
  const cursorPositionRef = useRef<{ x: number; y: number } | null>(null);
  const cursorVelocityRef = useRef({ x: 0, y: 0 });
  const cursorTargetRef = useRef<{ x: number; y: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  function setCursorPosition(x: number, y: number) {
    cursorRef.current?.style.setProperty("--not-found-cursor-x", `${x}px`);
    cursorRef.current?.style.setProperty("--not-found-cursor-y", `${y}px`);
  }

  function stopCursorAnimation() {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    lastFrameTimeRef.current = null;
  }

  function animateCursor(frameTime: number) {
    const position = cursorPositionRef.current;
    const target = cursorTargetRef.current;
    if (!position || !target) {
      stopCursorAnimation();
      return;
    }

    const lastFrameTime = lastFrameTimeRef.current ?? frameTime;
    const deltaSeconds = Math.min((frameTime - lastFrameTime) / 1000, 0.05);
    const nextX = stepZeroBounceSpring(
      { value: position.x, velocity: cursorVelocityRef.current.x },
      target.x,
      deltaSeconds,
      42,
    );
    const nextY = stepZeroBounceSpring(
      { value: position.y, velocity: cursorVelocityRef.current.y },
      target.y,
      deltaSeconds,
      42,
    );
    position.x = nextX.value;
    position.y = nextY.value;
    cursorVelocityRef.current = { x: nextX.velocity, y: nextY.velocity };
    lastFrameTimeRef.current = frameTime;
    setCursorPosition(position.x, position.y);

    const distance = Math.hypot(target.x - position.x, target.y - position.y);
    const speed = Math.hypot(nextX.velocity, nextY.velocity);
    if (distance < 0.5 && speed < 4) {
      position.x = target.x;
      position.y = target.y;
      cursorVelocityRef.current = { x: 0, y: 0 };
      setCursorPosition(position.x, position.y);
      animationFrameRef.current = null;
      lastFrameTimeRef.current = null;
      return;
    }

    animationFrameRef.current = requestAnimationFrame(animateCursor);
  }

  useEffect(() => {
    if (!reduceMotion) return;

    stopCursorAnimation();
    const target = cursorTargetRef.current;
    if (!target) return;

    cursorPositionRef.current = { ...target };
    cursorVelocityRef.current = { x: 0, y: 0 };
    setCursorPosition(target.x, target.y);
  }, [reduceMotion]);

  useEffect(() => stopCursorAnimation, []);

  function moveCursor(event: PointerEvent<HTMLAnchorElement>) {
    if (event.pointerType !== "mouse") return;
    setIsCursorVisible(true);
    cursorTargetRef.current = { x: event.clientX, y: event.clientY };
    if (!cursorPositionRef.current) {
      cursorPositionRef.current = { ...cursorTargetRef.current };
      cursorVelocityRef.current = { x: 0, y: 0 };
    }
    if (reduceMotion) {
      stopCursorAnimation();
      cursorPositionRef.current = { ...cursorTargetRef.current };
      cursorVelocityRef.current = { x: 0, y: 0 };
      setCursorPosition(event.clientX, event.clientY);
    } else if (animationFrameRef.current === null) {
      animationFrameRef.current = requestAnimationFrame(animateCursor);
    }
  }

  function leaveCursor() {
    setIsCursorVisible(false);
    stopCursorAnimation();
    cursorPositionRef.current = null;
    cursorTargetRef.current = null;
    cursorVelocityRef.current = { x: 0, y: 0 };
  }

  return (
    <main id="main-content" className="not-found-page">
      <NotFoundTracker />
      <Link
        className="not-found-page__desktop-link"
        href="/"
        aria-label="Back to Index"
        onPointerEnter={moveCursor}
        onPointerMove={moveCursor}
        onPointerLeave={leaveCursor}
      >
        <span className="not-found-page__content">
          <h1>Page not found</h1>
          <p>The page may have moved, or the link may be out of date.</p>
        </span>
        <span
          ref={cursorRef}
          className="not-found-page__cursor"
          aria-hidden="true"
          data-visible={isCursorVisible}
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
