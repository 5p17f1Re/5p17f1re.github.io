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
  destinationCoverRect?: CoverRectSnapshot;
};

const storageKey = "case-cover-motion-snapshot";
const birdviewNavigationMs = 200;
const snakeviewNavigationMs = 250;
// iOS-like app launch: decisive scale-up, then a short settling tail. The
// return transition deliberately keeps its separate canonical timing below.
const motionDebugScale = process.env.NODE_ENV === "development" ? 1.5 : 1;
const forwardSpeedScale = 0.46;
const forwardTakeoffMs = Math.round(520 * forwardSpeedScale * motionDebugScale);
const forwardLandingMs = Math.round(600 * forwardSpeedScale * motionDebugScale);
const forwardMotionMs = forwardTakeoffMs + forwardLandingMs;
// Keep only one paint for the homepage blur before mounting the destination.
// The persistent cover starts moving immediately; this delay is route handoff,
// not a pause in the motion timeline.
// Hold the homepage frame for one additional 50 ms before the route handoff
// so the shared canvas scale-down is visible instead of being swallowed by
// the first navigation paint.
const forwardMotionDelayMs = 66;
const forwardContentCrossfadeStartMs = 80;
const forwardContentCrossfadeMs = Math.round(220 * motionDebugScale);
const forwardTextRevealDelayMs = 100;
const forwardContentRevealMs =
  forwardTextRevealDelayMs + Math.round(320 * 1.5 * motionDebugScale);
const returnContentCrossfadeStartMs = 80;
const returnContentCrossfadeMs = 220;
const returnOffscreenMotionMs = 450;
const returnCoverLandingMs = 350;
const returnLandingMs = 500;
const forwardHandoffBufferMs = Math.round(16 * motionDebugScale);
const forwardTotalMs = Math.max(
  forwardMotionMs + forwardHandoffBufferMs,
  forwardContentRevealMs,
);
const returnTakeoffMs = snakeviewNavigationMs + returnCoverLandingMs;
const forwardEase = [0.16, 1, 0.3, 1] as const;
const returnEase = [0.12, 1, 0.2, 1] as const;

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
  const viewportWidth =
    typeof window === "undefined" ? source.width : window.innerWidth;
  const caseCoverTop = viewportWidth <= 800 ? 140 : 232;

  // The case shell's first full-width media starts after the fixed title block
  // and uses the same 16:9 cover format. Keeping this prediction close to the
  // real destination prevents the first route paint from changing the active
  // trajectory while the target node is still mounting.
  return {
    left: 0,
    top: caseCoverTop,
    width: viewportWidth,
    height: viewportWidth * (9 / 16),
  };
}

function getForwardRemainingMs(startedAt: number | undefined): number {
  if (startedAt === undefined) return forwardTotalMs;
  return Math.max(0, forwardTotalMs - (Date.now() - startedAt));
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
  returnHome: (event: ReactMouseEvent<HTMLAnchorElement>) => boolean;
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

function getVisibleCover(
  transitionId: string,
  role?: "source" | "target",
): HTMLElement | undefined {
  const roleSelector = role ? `[data-case-cover-role="${role}"]` : "";
  const selector = `[data-case-cover-motion="${CSS.escape(transitionId)}"]${roleSelector}`;
  const activeViewCover = document.querySelector<HTMLElement>(
    `[aria-hidden="false"] ${selector}`,
  );
  if (activeViewCover) return activeViewCover;

  return [...document.querySelectorAll<HTMLElement>(selector)].find((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const canMeasureHiddenCover =
      role === "target" ||
      (role === "source" &&
        document.documentElement.dataset.caseCoverMotionDirection === "return");
    const viewLayer = element.closest<HTMLElement>(".view-layer");
    return (
      style.display !== "none" &&
      (canMeasureHiddenCover || style.visibility !== "hidden") &&
      (!viewLayer || getComputedStyle(viewLayer).opacity !== "0") &&
      rect.width > 0
    );
  });
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
      }, Math.max(0, delayMs));
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

  const openCase = useCallback(
    (
      event: ReactMouseEvent<HTMLAnchorElement>,
      snapshot: Omit<
        TransitionSnapshot,
        "scrollY" | "sourceCoverRect"
      >,
    ) => {
      const isPlainPrimaryClick =
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey;
      if (!isPlainPrimaryClick || reduceMotion) return false;
      if (activeRef.current) return true;

      // Prevent the anchor's native navigation before arming the delayed
      // router handoff; otherwise the document can reload over the first
      // painted frame and discard the persistent transition layer.
      event.preventDefault();

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

  const returnHome = useCallback((event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (activeRef.current) {
      event.preventDefault();
      return true;
    }
    const snapshot = readSnapshot();
    if (!snapshot || reduceMotion) return false;

    event.preventDefault();
    const cover = getVisibleCover(snapshot.transitionId, "target");
    const coverRect = cover?.getBoundingClientRect();
    // All exits use the same compact landing motion. Keep the homepage card's
    // own cover in the persistent layer from the first return frame; the
    // case's first media image must never flash into the feed.
    // When the case cover is still in the viewport, preserve the canonical
    // return flight from that rect into the saved homepage card. Deep-scroll
    // exits keep the no-flight fallback because their source is not visible.
    const offscreenReturn = Boolean(
      coverRect &&
        (coverRect.bottom < 0 || coverRect.top > window.innerHeight),
    );

    document.documentElement.dataset.portfolioView = snapshot.view;
    try {
      localStorage.setItem("portfolio-view", snapshot.view);
    } catch {
      // The in-memory snapshot still restores the current transition.
    }
    const phase = offscreenReturn ? "landing" : "takeoff";
    setTransitionContent(
      coverContentRegistryRef.current.get(snapshot.transitionId)?.source ??
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
      takeoffStartedAt: Date.now(),
      destinationCoverRect: snapshot.sourceCoverRect,
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
      const cover = getVisibleCover(snapshot.transitionId, "source");
      const coverRect = cover?.getBoundingClientRect();
      setTransitionContent(
        coverContentRegistryRef.current.get(snapshot.transitionId)?.source ??
          coverContentRegistryRef.current.get(snapshot.transitionId)?.target ??
          null,
      );
      setReplacementContent(null);
      setTransition({
        ...snapshot,
        sourceCoverRect: snapshotCoverRect(coverRect),
        direction: "return",
        phase: "landing",
        takeoffStartedAt: Date.now(),
        destinationCoverRect: snapshot.sourceCoverRect,
        offscreenReturn: true,
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
      // The homepage restores its preferred view in its own layout effect.
      // Re-apply the captured scroll after those layout changes as well, or
      // the real card can drift away from the fixed transition layer.
      window.scrollTo({ top: active.scrollY, behavior: "instant" });
      let secondFrame = 0;
      let thirdFrame = 0;
      const restoreAfterLayout = () => {
        window.scrollTo({ top: active.scrollY, behavior: "instant" });
        thirdFrame = window.requestAnimationFrame(() => {
          window.scrollTo({ top: active.scrollY, behavior: "instant" });
        });
      };
      secondFrame = window.requestAnimationFrame(restoreAfterLayout);
      return () => {
        window.cancelAnimationFrame(secondFrame);
        window.cancelAnimationFrame(thirdFrame);
      };
    }
  }, [active, pathname]);

  useLayoutEffect(() => {
    const current = activeRef.current;
    if (
      !current ||
      pathname.replace(/\/$/, "") !== current.homePath.replace(/\/$/, "")
    ) {
      return;
    }

    let frame = 0;
    let attempts = 0;
    const alignProjectsToViewport = () => {
      const projects = document.querySelector<HTMLElement>(
        ".view-layer--current .projects",
      );
      if (!projects) {
        if (attempts < 6) {
          attempts += 1;
          frame = window.requestAnimationFrame(alignProjectsToViewport);
        }
        return;
      }

      const rect = projects.getBoundingClientRect();
      // Both directions use the same viewport-centered canvas scale. The
      // long page itself must not become the transform origin, otherwise the
      // visible cards appear to grow from the top of the document.
      projects.style.transformOrigin = `${window.innerWidth / 2 - rect.left}px ${window.innerHeight / 2 - rect.top}px`;
    };

    alignProjectsToViewport();
    frame = window.requestAnimationFrame(alignProjectsToViewport);

    return () => {
      window.cancelAnimationFrame(frame);
      const projects = document.querySelector<HTMLElement>(
        ".view-layer--current .projects",
      );
      projects?.style.removeProperty("transform-origin");
    };
  }, [
    active?.direction,
    active?.homePath,
    active?.offscreenReturn,
    active?.takeoffStartedAt,
    active?.transitionId,
    pathname,
  ]);

  useLayoutEffect(() => {
    const current = active;
    const normalizedPath = pathname.replace(/\/$/, "");
    if (!current) return;

    const destinationPath =
      current.direction === "forward" ? current.casePath : current.homePath;
    if (normalizedPath !== destinationPath.replace(/\/$/, "")) return;

    // Return already knows the saved homepage rect. It still needs an
    // explicit takeoff → landing handoff after the homepage mounts; without
    // it the canvas stays at scale(.9) until completion and then snaps to 1.
    if (current.destinationCoverRect) {
      if (current.direction === "return" && current.phase === "takeoff") {
        const frame = window.requestAnimationFrame(() => {
          const latest = activeRef.current;
          if (
            latest?.transitionId === current.transitionId &&
            latest.direction === "return" &&
            latest.phase === "takeoff"
          ) {
            setTransition({ ...latest, phase: "landing" });
            armFallback(returnLandingMs);
          }
        });
        return () => window.cancelAnimationFrame(frame);
      }
      if (
        current.direction === "return" &&
        !current.offscreenReturn &&
        current.phase === "landing"
      ) {
        if (handoffTimerRef.current !== null) {
          window.clearTimeout(handoffTimerRef.current);
        }
        // Reveal the homepage cover without restarting the canvas keyframe.
        // Both layers now have the same saved card geometry and content.
        handoffTimerRef.current = window.setTimeout(() => {
          handoffTimerRef.current = null;
          const latest = activeRef.current;
          if (
            latest?.transitionId === current.transitionId &&
            latest.direction === "return" &&
            latest.phase === "landing"
          ) {
            setTransition({ ...latest, phase: "handoff" });
          }
        }, returnCoverLandingMs + 32);
      }
      return;
    }

    const destinationRole = current.direction === "forward" ? "target" : "source";
    let frame = 0;
    let attempts = 0;
    let previousDestination: CoverRectSnapshot | undefined;

    const hasStableGeometry = (next: CoverRectSnapshot) => {
      if (!previousDestination) {
        previousDestination = next;
        return false;
      }

      const delta = Math.max(
        Math.abs(previousDestination.left - next.left),
        Math.abs(previousDestination.top - next.top),
        Math.abs(previousDestination.width - next.width),
        Math.abs(previousDestination.height - next.height),
      );
      previousDestination = next;
      return delta < 0.5;
    };

    const measureDestination = () => {
      attempts += 1;
      const destination = getVisibleCover(current.transitionId, destinationRole);
      const destinationRect = destination?.getBoundingClientRect();

      if (destinationRect && destinationRect.width > 0) {
        const destinationSnapshot = snapshotCoverRect(destinationRect);
        if (!destinationSnapshot || !hasStableGeometry(destinationSnapshot)) {
          if (attempts < 12) {
            frame = window.requestAnimationFrame(measureDestination);
          }
          return;
        }
        setTransition({
          ...current,
          // Entering the route only reveals its already-mounted content. The
          // persistent layer keeps the same transform timeline throughout.
          phase: "landing",
          destinationCoverRect: destinationSnapshot,
        });
        if (current.direction === "forward") {
          const targetContent =
            coverContentRegistryRef.current.get(current.transitionId)?.target;
          if (targetContent !== undefined) {
            setReplacementContent(targetContent);
          }
        } else if (!current.offscreenReturn) {
          if (handoffTimerRef.current !== null) {
            window.clearTimeout(handoffTimerRef.current);
          }
          // Reveal the homepage cover just after the 350 ms cover landing,
          // while the persistent layer is still present. This makes the
          // handoff overlap instead of exposing a final-frame geometry gap.
          handoffTimerRef.current = window.setTimeout(() => {
            handoffTimerRef.current = null;
            const latest = activeRef.current;
            if (
              latest?.transitionId === current.transitionId &&
              latest.direction === "return" &&
              latest.phase === "landing"
            ) {
              setTransition({ ...latest, phase: "handoff" });
            }
          }, returnCoverLandingMs + 32);
        }
        armFallback(
          current.direction === "forward"
            ? getForwardRemainingMs(current.takeoffStartedAt) +
              forwardHandoffBufferMs
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
  }, [active, armFallback, pathname, setTransition]);

  useEffect(
    () => () => {
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current);
      }
      if (handoffTimerRef.current !== null) {
        window.clearTimeout(handoffTimerRef.current);
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

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    document.documentElement.dataset.caseCoverMotionDebug = "true";
    return () => {
      delete document.documentElement.dataset.caseCoverMotionDebug;
    };
  }, []);

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
  const isOffscreenReturn =
    active?.direction === "return" && Boolean(active.offscreenReturn);
  const destinationRect = active?.destinationCoverRect;
  const sourceRect = isOffscreenReturn
    ? destinationRect
    : active?.sourceCoverRect;
  const destinationRectRef = useRef<CoverRectSnapshot | undefined>(undefined);
  const layerRef = useRef<HTMLDivElement>(null);
  const sourceContentRef = useRef<HTMLDivElement>(null);
  const replacementContentRef = useRef<HTMLDivElement>(null);

  const isForward = active?.direction === "forward";
  const activeDirection = active?.direction;
  const activeTransitionId = active?.transitionId;
  const activeTakeoffStartedAt = active?.takeoffStartedAt;
  const activeOffscreenReturn = active?.offscreenReturn;
  const animationTargetRect = isOffscreenReturn
    ? destinationRect
    : isForward
      ? destinationRect ??
        (sourceRect ? getPremeasureCoverRect(sourceRect) : undefined)
      : destinationRect;

  useLayoutEffect(() => {
    destinationRectRef.current = destinationRect;
  }, [destinationRect]);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer || !sourceRect) return;

    layer.style.setProperty("--case-cover-motion-left", `${sourceRect.left}px`);
    layer.style.setProperty("--case-cover-motion-top", `${sourceRect.top}px`);
    layer.style.setProperty("--case-cover-motion-width", `${sourceRect.width}px`);
    layer.style.setProperty("--case-cover-motion-height", `${sourceRect.height}px`);
  }, [
    sourceRect,
    sourceRect?.height,
    sourceRect?.left,
    sourceRect?.top,
    sourceRect?.width,
  ]);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer || !activeDirection || !activeTransitionId || !sourceRect) {
      return;
    }

    if (isOffscreenReturn) {
      const startedAt = activeTakeoffStartedAt ?? Date.now();
      let frame = 0;

      const updateOffscreenMotion = () => {
        const elapsed = Math.max(0, Date.now() - startedAt);
        const progress = Math.min(1, elapsed / returnOffscreenMotionMs);
        layer.style.setProperty("--case-cover-motion-left", `${sourceRect.left}px`);
        layer.style.setProperty("--case-cover-motion-top", `${sourceRect.top}px`);
        layer.style.setProperty("--case-cover-motion-width", `${sourceRect.width}px`);
        layer.style.setProperty("--case-cover-motion-height", `${sourceRect.height}px`);
        layer.style.opacity = "1";
        layer.style.filter = "none";
        layer.style.transform = "translate3d(0, 0, 0)";

        if (progress < 1) {
          frame = window.requestAnimationFrame(updateOffscreenMotion);
        }
      };

      updateOffscreenMotion();
      return () => window.cancelAnimationFrame(frame);
    }

    const isForwardTransition = activeDirection === "forward";
    if (!isForwardTransition && !animationTargetRect) return;

    const startedAt = activeTakeoffStartedAt ?? Date.now();
    const durationMs = isForwardTransition
      ? forwardMotionMs
      : returnCoverLandingMs;
    const ease = isForwardTransition ? forwardEase : returnEase;
    let frame = 0;

    const updateMotion = () => {
      const elapsed = Math.max(0, Date.now() - startedAt);
      const progress = Math.min(1, elapsed / durationMs);
      const easedProgress = cubicBezierProgress(progress, ease);
      const liveDestination = getVisibleCover(
        activeTransitionId,
        isForwardTransition ? "target" : "source",
      );
      const liveDestinationRect = snapshotCoverRect(
        liveDestination?.getBoundingClientRect(),
      );
      if (liveDestinationRect && liveDestinationRect.width > 0) {
        destinationRectRef.current = liveDestinationRect;
      }
      const destination =
        destinationRectRef.current ??
        (isForwardTransition
          ? getPremeasureCoverRect(sourceRect)
          : animationTargetRect);
      if (!destination) return;
      const currentRect = interpolateCoverRect(
        sourceRect,
        destination,
        easedProgress,
      );
      // Animate the frame's geometry instead of applying non-uniform scale to
      // its contents. The image keeps its proportions and object-fit handles
      // the changing crop as the icon becomes the case cover.
      layer.style.setProperty("--case-cover-motion-left", `${currentRect.left}px`);
      layer.style.setProperty("--case-cover-motion-top", `${currentRect.top}px`);
      layer.style.setProperty("--case-cover-motion-width", `${currentRect.width}px`);
      layer.style.setProperty("--case-cover-motion-height", `${currentRect.height}px`);
      layer.style.opacity = "1";
      layer.style.filter = "none";
      layer.style.transform = "translate3d(0, 0, 0)";

      if (progress < 1) {
        frame = window.requestAnimationFrame(updateMotion);
      }
    };

    updateMotion();
    return () => window.cancelAnimationFrame(frame);
  }, [
    activeDirection,
    activeTakeoffStartedAt,
    activeTransitionId,
    animationTargetRect,
    isOffscreenReturn,
    sourceRect,
    sourceRect?.height,
    sourceRect?.left,
    sourceRect?.top,
    sourceRect?.width,
  ]);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer || !activeDirection || !activeTransitionId || !content) {
      return;
    }

    const startedAt = activeTakeoffStartedAt ?? Date.now();
    const isForwardTransition = activeDirection === "forward";
    const crossfadeStartMs = isForwardTransition
      ? forwardContentCrossfadeStartMs
      : returnContentCrossfadeStartMs;
    const crossfadeDurationMs = isForwardTransition
      ? forwardContentCrossfadeMs
      : returnContentCrossfadeMs;
    let frame = 0;

    const updateContentCrossfade = () => {
      const elapsed = Math.max(0, Date.now() - startedAt);
      const progress = replacementContent
        ? Math.min(
            1,
            Math.max(
              0,
              (elapsed - crossfadeStartMs) / crossfadeDurationMs,
            ),
          )
        : 0;
      const opacity = cubicBezierProgress(progress, forwardEase);
      // Keep the source opaque while the replacement is painted over it. A
      // crossfade makes both images transparent in the middle and exposes the
      // page background as a visible hole.
      if (sourceContentRef.current) {
        sourceContentRef.current.style.opacity = "1";
      }
      if (replacementContentRef.current) {
        replacementContentRef.current.style.opacity = String(opacity);
      }

      if (progress < 1) {
        frame = window.requestAnimationFrame(updateContentCrossfade);
      }
    };

    updateContentCrossfade();
    return () => window.cancelAnimationFrame(frame);
  }, [
    activeDirection,
    activeOffscreenReturn,
    activeTakeoffStartedAt,
    activeTransitionId,
    content,
    replacementContent,
  ]);

  if (!active || !content || !sourceRect) return null;

  return (
    <motion.div
      ref={layerRef}
      key={`${active.transitionId}-${active.direction}`}
      className="case-cover-motion-layer"
      initial={false}
    >
      <div
        ref={sourceContentRef}
        className="case-cover-motion-layer__content"
      >
        {content}
      </div>
      {replacementContent ? (
        <div
          ref={replacementContentRef}
          className="case-cover-motion-layer__content case-cover-motion-layer__content--replacement"
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
  // The homepage cover is the same content already held by the persistent
  // layer. Keep it mounted and visible as soon as home mounts on return; the
  // fixed layer remains above it until handoff, so there is no first-paint
  // replacement at the end of the flight.
  const isReturnCover = !target && active?.direction === "return";
  const isHiddenByTransition =
    participates &&
    !isTargetHandoff &&
    !isReturnCover;

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
