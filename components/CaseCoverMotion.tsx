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
  matchCutRect?: CoverRectSnapshot;
  destinationCoverRect?: CoverRectSnapshot;
};

const storageKey = "case-cover-motion-snapshot";
const birdviewNavigationMs = 200;
const snakeviewNavigationMs = 250;
// The forward cover uses one persistent layer with a deliberate match-cut:
// it takes off from the homepage, switches to the case cover at an
// intermediate measured rect, then lands on the case geometry. The 50ms
// lead-in keeps the surrounding blur visible before motion.
const forwardTakeoffMs = 320;
const forwardLandingMs = 360;
const forwardMotionDelayMs = 50;
const forwardHandoffMs = 140;
const returnCoverLandingMs = 350;
const returnLandingMs = 500;
const forwardTotalMs =
  forwardMotionDelayMs + forwardTakeoffMs + forwardLandingMs + forwardHandoffMs;
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

        const targetContent =
          coverContentRegistryRef.current.get(current.transitionId)?.target;
        if (targetContent !== undefined) {
          setTransitionContent(targetContent);
        }
        // Match-cut is the boundary between takeoff and landing, not a
        // rendered pause: switch content and start the next geometry tween
        // in the same React update.
        setTransition({ ...current, phase: "landing" });
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
      }, forwardTakeoffMs);
    },
    [setTransition, setTransitionContent],
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
      writeSnapshot(nextSnapshot);
      setTransition({
        ...nextSnapshot,
        direction: "forward",
        phase: "takeoff",
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
        const matchCutRect =
          current.direction === "forward" &&
          current.sourceCoverRect &&
          destinationSnapshot
            ? interpolateCoverRect(current.sourceCoverRect, destinationSnapshot, 0.46)
            : undefined;
        setTransition({
          ...current,
          phase: current.direction === "forward" ? "takeoff" : "landing",
          matchCutRect,
          destinationCoverRect: destinationSnapshot,
        });
        if (current.direction === "forward") {
          armForwardMatchCut({
            ...current,
            phase: "takeoff",
            matchCutRect,
            destinationCoverRect: destinationSnapshot,
          });
        }
        armFallback(
          current.direction === "forward"
            ? forwardTakeoffMs + forwardLandingMs + forwardHandoffMs
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
      <CaseCoverTransitionLayer content={transitionContent} />
    </CaseCoverMotionContext.Provider>
  );
}

export function CaseMotionRoutes({ children }: { children: ReactNode }) {
  return <div className="case-motion-route">{children}</div>;
}

function CaseCoverTransitionLayer({ content }: { content: ReactNode | null }) {
  const { active } = useCaseCoverMotion();
  const sourceRect = active?.sourceCoverRect;
  const destinationRect = active?.destinationCoverRect;
  const animationTargetRect =
    active?.direction === "forward" &&
    active.phase === "takeoff"
      ? active.matchCutRect ?? destinationRect
      : destinationRect;
  const hasGeometry = Boolean(sourceRect && animationTargetRect);

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
  const durationMs =
    active.direction === "forward"
      ? active.phase === "takeoff"
        ? forwardTakeoffMs
        : active.phase === "handoff"
          ? forwardHandoffMs
          : forwardLandingMs
      : returnCoverLandingMs;

  return (
    <motion.div
      key={`${active.transitionId}-${active.direction}`}
      className="case-cover-motion-layer"
      initial={false}
      animate={
        hasGeometry
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
        hasGeometry
          ? { duration: durationMs / 1000, ease: landingEase }
          : { duration: 0 }
      }
      style={{
        left: sourceRect.left,
        top: sourceRect.top,
        width: sourceRect.width,
        height: sourceRect.height,
      }}
    >
      <div className="case-cover-motion-layer__content">{content}</div>
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
