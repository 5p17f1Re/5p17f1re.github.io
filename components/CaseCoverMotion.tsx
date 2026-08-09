"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { motion, useReducedMotion } from "motion/react";

type ViewMode = "birdview" | "snakeview";
type Direction = "forward" | "return";
type TransitionPhase = "takeoff" | "landing" | "handoff";
type CoverRectSnapshot = {
  left: number;
  top: number;
  width: number;
  height: number;
};
type TransitionSnapshot = {
  transitionId: string;
  casePath: string;
  homePath: string;
  scrollY: number;
  view: ViewMode;
  sourceCoverRect?: CoverRectSnapshot;
};
type ActiveTransition = TransitionSnapshot & {
  direction: Direction;
  phase: TransitionPhase;
  offscreenReturn?: boolean;
  takeoffStartedAt?: number;
  matchCutActive?: boolean;
  destinationCoverRect?: CoverRectSnapshot;
};

const storageKey = "case-cover-motion-snapshot";
const birdviewNavigationMs = 200;
const snakeviewNavigationMs = 250;
// Forward motion is one absolute-time trajectory. Match-cut only changes the
// content inside the persistent layer; it must never restart the transform
// easing at the route boundary.
const forwardTakeoffMs = 320;
const forwardLandingMs = 360;
const forwardMotionMs = forwardTakeoffMs + forwardLandingMs;
const forwardMotionDelayMs = 0;
const forwardHandoffMs = 140;
const matchCutBlurMs = 80;
const returnCoverLandingMs = 350;
const returnLandingMs = 500;
const forwardTotalMs =
  forwardMotionDelayMs + forwardMotionMs + forwardHandoffMs;
const returnTakeoffMs = snakeviewNavigationMs + returnCoverLandingMs;
const landingEase = [0.12, 1, 0.2, 1] as const;

function snapshotCoverRect(rect: DOMRect | undefined): CoverRectSnapshot | undefined {
  if (!rect) return undefined;

  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function interpolateCoverRect(
  source: CoverRectSnapshot,
  destination: CoverRectSnapshot,
  progress: number,
): CoverRectSnapshot {
  return {
    left: source.left + (destination.left - source.left) * progress,
    top: source.top + (destination.top - source.top) * progress,
    width: source.width + (destination.width - source.width) * progress,
    height: source.height + (destination.height - source.height) * progress,
  };
}

function getPremeasureCoverRect(source: CoverRectSnapshot): CoverRectSnapshot {
  return {
    left: source.left,
    top: source.top - source.height * 0.14,
    width: source.width * 1.08,
    height: source.height * 1.04,
  };
}

function getForwardRemainingMs(startedAt: number | undefined): number {
  if (startedAt === undefined) return forwardMotionMs;
  return Math.max(0, forwardMotionMs - (Date.now() - startedAt));
}

function cubicBezierProgress(
  progress: number,
  ease: readonly [number, number, number, number],
): number {
  const [x1, y1, x2, y2] = ease;
  const clamped = Math.min(1, Math.max(0, progress));
  let low = 0;
  let high = 1;
  let parameter = clamped;

  for (let index = 0; index < 12; index += 1) {
    const x =
      3 * (1 - parameter) ** 2 * parameter * x1 +
      3 * (1 - parameter) * parameter ** 2 * x2 +
      parameter ** 3;
    if (x < clamped) low = parameter;
    else high = parameter;
    parameter = (low + high) / 2;
  }

  return (
    3 * (1 - parameter) ** 2 * parameter * y1 +
    3 * (1 - parameter) * parameter ** 2 * y2 +
    parameter ** 3
  );
}

function coverTransform(
  source: CoverRectSnapshot,
  current: CoverRectSnapshot,
): string {
  const sourceCenterX = source.left + source.width / 2;
  const sourceCenterY = source.top + source.height / 2;
  const currentCenterX = current.left + current.width / 2;
  const currentCenterY = current.top + current.height / 2;

  return `translate3d(${currentCenterX - sourceCenterX}px, ${currentCenterY - sourceCenterY}px, 0) scale(${current.width / source.width}, ${current.height / source.height})`;
}

type CaseCoverMotionContextValue = {
  active: ActiveTransition | null;
  registerCoverContent: (
    transitionId: string,
    target: boolean,
    content: ReactNode,
  ) => void;
  openCase: (
    event: ReactMouseEvent<HTMLAnchorElement>,
    snapshot: Omit<
      TransitionSnapshot,
      "scrollY" | "sourceCoverRect"
    >,
  ) => boolean;
  returnHome: () => boolean;
};

const CaseCoverMotionContext = createContext<CaseCoverMotionContextValue | null>(
  null,
);

function readSnapshot() {
  try {
    const value = sessionStorage.getItem(storageKey);
    return value ? (JSON.parse(value) as TransitionSnapshot) : null;
  } catch {
    return null;
  }
}

function writeSnapshot(snapshot: TransitionSnapshot) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
  } catch {
    // Navigation remains functional when storage is unavailable.
  }
}

function removeSnapshot() {
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
}

export function CaseCoverMotionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState<ActiveTransition | null>(null);
  const [transitionContent, setTransitionContent] = useState<ReactNode | null>(
    null,
  );
  const [replacementContent, setReplacementContent] =
    useState<ReactNode | null>(null);
  const activeRef = useRef<ActiveTransition | null>(null);
  const coverContentRegistryRef = useRef(
    new Map<string, { source?: ReactNode; target?: ReactNode }>(),
  );
  const navigationTimerRef = useRef<number | null>(null);
  const completionTimerRef = useRef<number | null>(null);
  const handoffTimerRef = useRef<number | null>(null);
  const matchCutTimerRef = useRef<number | null>(null);

  const setTransition = useCallback((next: ActiveTransition | null) => {
    activeRef.current = next;
    setActive(next);
    document.documentElement.toggleAttribute(
      "data-case-cover-motion-active",
      Boolean(next),
    );
    if (next) {
      document.documentElement.dataset.caseCoverMotionDirection = next.direction;
      document.documentElement.dataset.caseCoverMotionId = next.transitionId;
      document.documentElement.dataset.caseCoverMotionPhase = next.phase;
      document.documentElement.toggleAttribute(
        "data-case-cover-motion-offscreen",
        Boolean(next.offscreenReturn),
      );
    } else {
      delete document.documentElement.dataset.caseCoverMotionDirection;
      delete document.documentElement.dataset.caseCoverMotionId;
      delete document.documentElement.dataset.caseCoverMotionPhase;
      document.documentElement.removeAttribute(
        "data-case-cover-motion-offscreen",
      );
    }
  }, []);

  const registerCoverContent = useCallback(
    (transitionId: string, target: boolean, content: ReactNode) => {
      const registered =
        coverContentRegistryRef.current.get(transitionId) ?? {};
      coverContentRegistryRef.current.set(transitionId, {
        ...registered,
        ...(target ? { target: content } : { source: content }),
      });
    },
    [],
  );

  const complete = useCallback(() => {
    if (completionTimerRef.current !== null) {
      window.clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
    if (handoffTimerRef.current !== null) {
      window.clearTimeout(handoffTimerRef.current);
      handoffTimerRef.current = null;
    }
    if (matchCutTimerRef.current !== null) {
      window.clearTimeout(matchCutTimerRef.current);
      matchCutTimerRef.current = null;
    }
    const completed = activeRef.current;
    setTransition(null);
    setTransitionContent(null);
    setReplacementContent(null);
    if (completed?.direction === "return") removeSnapshot();
  }, [setTransition]);

  const armNavigation = useCallback(
    (navigate: () => void, delayMs: number) => {
      navigationTimerRef.current = window.setTimeout(() => {
        if (!activeRef.current) return;
        navigate();
      }, delayMs);
    },
    [],
  );

  const armFallback = useCallback((durationMs = forwardTotalMs) => {
    if (completionTimerRef.current !== null) {
      window.clearTimeout(completionTimerRef.current);
    }
    completionTimerRef.current = window.setTimeout(
      complete,
      reduceMotion ? 50 : durationMs,
    );
  }, [complete, reduceMotion]);

  const armForwardMatchCut = useCallback(
    (transition: ActiveTransition) => {
      if (transition.direction !== "forward") return;

      if (matchCutTimerRef.current !== null) {
        window.clearTimeout(matchCutTimerRef.current);
      }

      matchCutTimerRef.current = window.setTimeout(() => {
        matchCutTimerRef.current = null;
        const current = activeRef.current;
        if (
          !current ||
          current.transitionId !== transition.transitionId ||
          current.direction !== "forward" ||
          current.phase !== "takeoff"
        ) {
          return;
        }

        // The transform is already running from the original start time. This
        // state update only changes the visible content and starts the short
        // blur veil; it must not create a second geometry animation.
        setTransition({
          ...current,
          phase: "landing",
          matchCutActive: true,
        });
        matchCutTimerRef.current = window.setTimeout(() => {
          matchCutTimerRef.current = null;
          const latest = activeRef.current;
          if (
            latest?.transitionId === current.transitionId &&
            latest.direction === "forward" &&
            latest.matchCutActive
          ) {
            setTransition({ ...latest, matchCutActive: false });
          }
        }, matchCutBlurMs);
        if (handoffTimerRef.current !== null) {
          window.clearTimeout(handoffTimerRef.current);
        }
        handoffTimerRef.current = window.setTimeout(() => {
          handoffTimerRef.current = null;
          const landing = activeRef.current;
          if (
            landing?.transitionId === current.transitionId &&
            landing.direction === "forward" &&
            landing.phase === "landing"
          ) {
            setTransition({ ...landing, phase: "handoff" });
          }
        }, forwardLandingMs);
      },
      transition.takeoffStartedAt === undefined
        ? forwardTakeoffMs
        : Math.max(0, forwardTakeoffMs - (Date.now() - transition.takeoffStartedAt)),
      );
    },
    [setTransition],
  );

  const openCase = useCallback(
    (
      event: ReactMouseEvent<HTMLAnchorElement>,
      snapshot: Omit<
        TransitionSnapshot,
        "scrollY" | "sourceCoverRect"
      >,
    ) => {
      const isPlainPrimaryClick =
        event.button === 0 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey;
      if (!isPlainPrimaryClick || reduceMotion) return false;
      if (activeRef.current) return true;

      const cover = event.currentTarget.querySelector<HTMLElement>(
        `[data-case-cover-motion="${CSS.escape(snapshot.transitionId)}"]`,
      );
      const coverRect = cover?.getBoundingClientRect();
      const nextSnapshot = {
        ...snapshot,
        scrollY: window.scrollY,
        sourceCoverRect: snapshotCoverRect(coverRect),
      };
      setTransitionContent(
        coverContentRegistryRef.current.get(snapshot.transitionId)?.source ??
          null,
      );
      setReplacementContent(null);
      writeSnapshot(nextSnapshot);
      setTransition({
        ...nextSnapshot,
        direction: "forward",
        phase: "takeoff",
        takeoffStartedAt: Date.now(),
      });
      armFallback();
      armNavigation(
        () => router.push(snapshot.casePath, { scroll: false }),
        forwardMotionDelayMs,
      );
      return true;
    },
    [armFallback, armNavigation, reduceMotion, router, setTransition],
  );

  const returnHome = useCallback(() => {
    if (activeRef.current) return true;
    const snapshot = readSnapshot();
    if (!snapshot || reduceMotion) return false;
    const cover = document.querySelector<HTMLElement>(
      `[data-case-cover-motion="${CSS.escape(snapshot.transitionId)}"]`,
    );
    const coverRect = cover?.getBoundingClientRect();
    const offscreenReturn = Boolean(
      coverRect && (coverRect.bottom < 0 || coverRect.top > window.innerHeight),
    );

    document.documentElement.dataset.portfolioView = snapshot.view;
    try {
      localStorage.setItem("portfolio-view", snapshot.view);
    } catch {
      // The in-memory snapshot still restores the current transition.
    }
    const phase = offscreenReturn ? "landing" : "takeoff";
    setTransitionContent(
      coverContentRegistryRef.current.get(snapshot.transitionId)?.target ??
        null,
    );
    setReplacementContent(null);
    setTransition({
      ...snapshot,
      sourceCoverRect: snapshotCoverRect(coverRect),
      direction: "return",
      phase,
      offscreenReturn,
    });
    armFallback(phase === "landing" ? returnLandingMs : returnTakeoffMs);
    if (offscreenReturn) {
      router.push(snapshot.homePath, { scroll: false });
    } else {
      armNavigation(
        () => router.push(snapshot.homePath, { scroll: false }),
        snapshot.view === "birdview"
          ? birdviewNavigationMs
          : snakeviewNavigationMs,
      );
    }
    return true;
  }, [armFallback, armNavigation, reduceMotion, router, setTransition]);

  useEffect(() => {
    const handlePopState = () => {
      const snapshot = readSnapshot();
      if (!snapshot || activeRef.current || reduceMotion) return;
      if (
        window.location.pathname.replace(/\/$/, "") !==
        snapshot.homePath.replace(/\/$/, "")
      ) {
        return;
      }
      document.documentElement.dataset.portfolioView = snapshot.view;
      const cover = document.querySelector<HTMLElement>(
        `[data-case-cover-motion="${CSS.escape(snapshot.transitionId)}"]`,
      );
      const coverRect = cover?.getBoundingClientRect();
      setTransitionContent(
        coverContentRegistryRef.current.get(snapshot.transitionId)?.target ??
          null,
      );
      setReplacementContent(null);
      setTransition({
        ...snapshot,
        sourceCoverRect: snapshotCoverRect(coverRect),
        direction: "return",
        phase: "landing",
        offscreenReturn: Boolean(
          coverRect &&
            (coverRect.bottom < 0 || coverRect.top > window.innerHeight),
        ),
      });
      armFallback(returnLandingMs);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [armFallback, reduceMotion, setTransition]);

  useLayoutEffect(() => {
    if (!active) return;
    const normalizedPath = pathname.replace(/\/$/, "");
    if (
      active.direction === "forward" &&
      normalizedPath === active.casePath.replace(/\/$/, "")
    ) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    if (
      active.direction === "return" &&
      normalizedPath === active.homePath.replace(/\/$/, "")
    ) {
      window.scrollTo({ top: active.scrollY, behavior: "instant" });
    }
  }, [active, pathname]);

  useLayoutEffect(() => {
    const current = active;
    const normalizedPath = pathname.replace(/\/$/, "");
    if (!current || current.offscreenReturn || current.destinationCoverRect) {
      return;
    }

    const destinationPath =
      current.direction === "forward" ? current.casePath : current.homePath;
    if (normalizedPath !== destinationPath.replace(/\/$/, "")) return;

    const destinationRole = current.direction === "forward" ? "target" : "source";
    let frame = 0;
    let attempts = 0;

    const measureDestination = () => {
      attempts += 1;
      const destination = document.querySelector<HTMLElement>(
        `[data-case-cover-motion="${CSS.escape(current.transitionId)}"][data-case-cover-role="${destinationRole}"]`,
      );
      const destinationRect = destination?.getBoundingClientRect();

      if (destinationRect && destinationRect.width > 0) {
        const destinationSnapshot = snapshotCoverRect(destinationRect);
        setTransition({
          ...current,
          phase: current.direction === "forward" ? "takeoff" : "landing",
          destinationCoverRect: destinationSnapshot,
        });
        if (current.direction === "forward") {
          const targetContent =
            coverContentRegistryRef.current.get(current.transitionId)?.target;
          if (targetContent !== undefined) {
            setReplacementContent(targetContent);
          }
          armForwardMatchCut({
            ...current,
            phase: "takeoff",
            destinationCoverRect: destinationSnapshot,
          });
        }
        armFallback(
          current.direction === "forward"
            ? getForwardRemainingMs(current.takeoffStartedAt) + forwardHandoffMs
            : returnLandingMs,
        );
        return;
      }

      if (attempts < 8) {
        frame = window.requestAnimationFrame(measureDestination);
      }
    };

    frame = window.requestAnimationFrame(measureDestination);
    return () => window.cancelAnimationFrame(frame);
  }, [active, armFallback, armForwardMatchCut, pathname, setTransition]);

  useEffect(
    () => () => {
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current);
      }
      if (handoffTimerRef.current !== null) {
        window.clearTimeout(handoffTimerRef.current);
      }
      if (matchCutTimerRef.current !== null) {
        window.clearTimeout(matchCutTimerRef.current);
      }
      if (navigationTimerRef.current !== null) {
        window.clearTimeout(navigationTimerRef.current);
      }
      document.documentElement.removeAttribute("data-case-cover-motion-active");
      delete document.documentElement.dataset.caseCoverMotionDirection;
      delete document.documentElement.dataset.caseCoverMotionId;
      delete document.documentElement.dataset.caseCoverMotionPhase;
      document.documentElement.removeAttribute(
        "data-case-cover-motion-offscreen",
      );
    },
    [],
  );

  return (
    <CaseCoverMotionContext.Provider
      value={{ active, registerCoverContent, openCase, returnHome }}
    >
      {children}
      <CaseCoverTransitionLayer
        content={transitionContent}
        replacementContent={replacementContent}
      />
    </CaseCoverMotionContext.Provider>
  );
}

export function CaseMotionRoutes({ children }: { children: ReactNode }) {
  return <div className="case-motion-route">{children}</div>;
}

function CaseCoverTransitionLayer({
  content,
  replacementContent,
}: {
  content: ReactNode | null;
  replacementContent: ReactNode | null;
}) {
  const { active } = useCaseCoverMotion();
  const sourceRect = active?.sourceCoverRect;
  const destinationRect = active?.destinationCoverRect;
  const destinationRectRef = useRef<CoverRectSnapshot | undefined>(undefined);
  const layerRef = useRef<HTMLDivElement>(null);

  const isForward = active?.direction === "forward";
  const animationTargetRect = isForward
    ? destinationRect ?? (sourceRect ? getPremeasureCoverRect(sourceRect) : undefined)
    : destinationRect;
  const hasGeometry = Boolean(sourceRect && animationTargetRect);

  useLayoutEffect(() => {
    destinationRectRef.current = destinationRect;
  }, [destinationRect]);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer || !isForward || !sourceRect) return;

    const startedAt = active?.takeoffStartedAt ?? Date.now();
    let frame = 0;

    const updateForwardMotion = () => {
      const elapsed = Math.max(0, Date.now() - startedAt);
      const progress = Math.min(1, elapsed / forwardMotionMs);
      const easedProgress = cubicBezierProgress(progress, landingEase);
      const destination =
        destinationRectRef.current ?? getPremeasureCoverRect(sourceRect);
      const currentRect = interpolateCoverRect(
        sourceRect,
        destination,
        easedProgress,
      );
      layer.style.transform = coverTransform(sourceRect, currentRect);

      if (progress < 1) {
        frame = window.requestAnimationFrame(updateForwardMotion);
      }
    };

    updateForwardMotion();
    return () => window.cancelAnimationFrame(frame);
  }, [
    active?.direction,
    active?.takeoffStartedAt,
    active?.transitionId,
    isForward,
    sourceRect,
    sourceRect?.height,
    sourceRect?.left,
    sourceRect?.top,
    sourceRect?.width,
  ]);

  if (!active || active.offscreenReturn || !content || !sourceRect) return null;

  const sourceCenterX = sourceRect.left + sourceRect.width / 2;
  const sourceCenterY = sourceRect.top + sourceRect.height / 2;
  const destinationCenterX = animationTargetRect
    ? animationTargetRect.left + animationTargetRect.width / 2
    : sourceCenterX;
  const destinationCenterY = animationTargetRect
    ? animationTargetRect.top + animationTargetRect.height / 2
    : sourceCenterY;
  const destinationScale = animationTargetRect
    ? animationTargetRect.width / sourceRect.width
    : 1;
  const destinationScaleY = animationTargetRect
    ? animationTargetRect.height / sourceRect.height
    : 1;
  const showReplacement =
    isForward &&
    active.phase !== "takeoff" &&
    replacementContent !== null;
  const layerClassName = `case-cover-motion-layer${
    active.matchCutActive ? " case-cover-motion-layer--match-cut" : ""
  }`;

  return (
    <motion.div
      ref={layerRef}
      key={`${active.transitionId}-${active.direction}`}
      className={layerClassName}
      initial={false}
      animate={
        isForward
          ? undefined
          : hasGeometry
            ? {
                x: destinationCenterX - sourceCenterX,
                y: destinationCenterY - sourceCenterY,
                scaleX: destinationScale,
                scaleY: destinationScaleY,
                opacity: 1,
              }
            : { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }
      }
      transition={
        isForward
          ? undefined
          : hasGeometry
            ? { duration: returnCoverLandingMs / 1000, ease: landingEase }
            : { duration: 0 }
      }
      style={{
        left: sourceRect.left,
        top: sourceRect.top,
        width: sourceRect.width,
        height: sourceRect.height,
      }}
    >
      <div
        className="case-cover-motion-layer__content"
        style={{ opacity: showReplacement ? 0 : 1 }}
      >
        {content}
      </div>
      {replacementContent ? (
        <div
          className="case-cover-motion-layer__content case-cover-motion-layer__content--replacement"
          style={{ opacity: showReplacement ? 1 : 0 }}
        >
          {replacementContent}
        </div>
      ) : null}
    </motion.div>
  );
}

export function SharedCaseCover({
  transitionId,
  enabled = true,
  target = false,
  className,
  children,
}: {
  transitionId?: string;
  enabled?: boolean;
  target?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const { active, registerCoverContent } = useCaseCoverMotion();
  const coverRef = useRef<HTMLDivElement>(null);
  const isActiveCover = active?.transitionId === transitionId;
  const participates = Boolean(transitionId) && enabled && isActiveCover;
  const isTargetHandoff =
    target &&
    active?.direction === "forward" &&
    active.phase === "handoff";
  const isHiddenByTransition =
    participates && !active?.offscreenReturn && !isTargetHandoff;

  useLayoutEffect(() => {
    if (!transitionId || !enabled) return;
    registerCoverContent(transitionId, target, children);
  }, [children, enabled, registerCoverContent, target, transitionId]);

  return (
    <motion.div
      ref={coverRef}
      className={className}
      data-case-cover-motion={transitionId}
      data-case-cover-role={target ? "target" : "source"}
      initial={false}
      style={{
        transformOrigin: "50% 50%",
        visibility: isHiddenByTransition ? "hidden" : undefined,
      }}
    >
      {children}
    </motion.div>
  );
}

export function useCaseCoverMotion() {
  const value = useContext(CaseCoverMotionContext);
  if (!value) {
    throw new Error(
      "useCaseCoverMotion must be used inside CaseCoverMotionProvider",
    );
  }
  return value;
}
