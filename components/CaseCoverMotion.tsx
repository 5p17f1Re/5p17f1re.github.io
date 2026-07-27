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
type TransitionPhase = "takeoff" | "landing";
type TransitionSnapshot = {
  transitionId: string;
  casePath: string;
  homePath: string;
  scrollY: number;
  view: ViewMode;
  travelX?: number;
  travelY?: number;
  travelScale?: number;
};
type ActiveTransition = TransitionSnapshot & {
  direction: Direction;
  phase: TransitionPhase;
  offscreenReturn?: boolean;
};

const storageKey = "case-cover-motion-snapshot";
const birdviewNavigationMs = 200;
const snakeviewNavigationMs = 250;
const positionAnimationMs = 300;
const landingMs = 350;
const returnLandingMs = 500;
const totalMs = snakeviewNavigationMs + landingMs;
const landingEase = [0.12, 1, 0.2, 1] as const;
const landingOpacityEase = [0.4, 0, 0.2, 1] as const;
const takeoffEase = [0.45, 0, 0.75, 0.65] as const;
type CaseCoverMotionContextValue = {
  active: ActiveTransition | null;
  openCase: (
    event: ReactMouseEvent<HTMLAnchorElement>,
    snapshot: Omit<
      TransitionSnapshot,
      "scrollY" | "travelX" | "travelY" | "travelScale"
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
  const activeRef = useRef<ActiveTransition | null>(null);
  const navigationTimerRef = useRef<number | null>(null);
  const completionTimerRef = useRef<number | null>(null);

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

  const complete = useCallback(() => {
    if (completionTimerRef.current !== null) {
      window.clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
    const completed = activeRef.current;
    setTransition(null);
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

  const armFallback = useCallback((durationMs = totalMs) => {
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
        "scrollY" | "travelX" | "travelY" | "travelScale"
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
      const targetWidth = Math.min(window.innerWidth, 1156);
      const targetTop = window.innerWidth <= 800 ? 140 : 232;
      const aspectRatio = coverRect
        ? coverRect.width / coverRect.height
        : 1;
      const targetHeight = targetWidth / aspectRatio;
      const travelProgress = 1.1;
      const travelX = coverRect
        ? (window.innerWidth / 2 - (coverRect.left + coverRect.width / 2)) *
          travelProgress
        : 0;
      const travelY = coverRect
        ? (targetTop + targetHeight / 2 -
            (coverRect.top + coverRect.height / 2)) *
          travelProgress
        : 0;
      const fullScale = coverRect ? targetWidth / coverRect.width : 1;
      const travelScale =
        snapshot.view === "birdview"
          ? 1.35
          : Math.min(
              1.07,
              1 + Math.min(Math.max(fullScale - 1, 0), 0.22) * 0.5,
            );
      const nextSnapshot = {
        ...snapshot,
        scrollY: window.scrollY,
        travelX,
        travelY,
        travelScale,
      };
      writeSnapshot(nextSnapshot);
      setTransition({
        ...nextSnapshot,
        direction: "forward",
        phase: "takeoff",
      });
      armFallback();
      armNavigation(
        () => router.push(snapshot.casePath, { scroll: false }),
        snapshot.view === "birdview"
          ? birdviewNavigationMs
          : snakeviewNavigationMs,
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
    setTransition({
      ...snapshot,
      direction: "return",
      phase,
      offscreenReturn,
    });
    armFallback(phase === "landing" ? returnLandingMs : totalMs);
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
      setTransition({
        ...snapshot,
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
    const current = activeRef.current;
    if (!current) return;
    const normalizedPath = pathname.replace(/\/$/, "");
    if (
      current.direction === "forward" &&
      normalizedPath === current.casePath.replace(/\/$/, "")
    ) {
      window.scrollTo({ top: 0, behavior: "instant" });
      if (current.phase === "takeoff") {
        setTransition({ ...current, phase: "landing" });
        armFallback(landingMs);
      }
    }
    if (
      current.direction === "return" &&
      normalizedPath === current.homePath.replace(/\/$/, "")
    ) {
      window.scrollTo({ top: current.scrollY, behavior: "instant" });
      if (current.phase === "takeoff") {
        setTransition({ ...current, phase: "landing" });
        armFallback(returnLandingMs);
      }
    }
  }, [armFallback, pathname, setTransition]);

  useEffect(
    () => () => {
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current);
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
      value={{ active, openCase, returnHome }}
    >
      {children}
    </CaseCoverMotionContext.Provider>
  );
}

export function CaseMotionRoutes({ children }: { children: ReactNode }) {
  return <div className="case-motion-route">{children}</div>;
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
  const { active } = useCaseCoverMotion();
  const isActiveCover = active?.transitionId === transitionId;
  const participates = Boolean(transitionId) && enabled && isActiveCover;
  const travelX = active?.travelX ?? 0;
  const travelY = active?.travelY ?? 0;
  const travelScale = active?.travelScale ?? 1.2;

  let coverAnimation = { opacity: 1, scale: 1 };
  let coverPosition = { x: 0, y: 0 };
  if (isActiveCover && active?.direction === "forward") {
    if (active.phase === "takeoff" && !target) {
      coverAnimation = { opacity: 1, scale: travelScale };
      coverPosition = { x: travelX, y: travelY };
    } else if (active.phase === "takeoff" && target) {
      coverAnimation = { opacity: 0, scale: 0.9 };
      coverPosition = { x: 0, y: 48 };
    } else if (active.phase === "landing") {
      coverAnimation = target
        ? { opacity: 1, scale: 1 }
        : { opacity: 0, scale: 1 };
    }
  }
  if (isActiveCover && active?.direction === "return") {
    if (active.phase === "takeoff") {
      coverAnimation = target
        ? { opacity: 1, scale: 0.9 }
        : { opacity: 0, scale: 1.2 };
      if (target) coverPosition = { x: 0, y: 48 };
    } else {
      coverAnimation = target
        ? { opacity: 0, scale: 0.9 }
        : { opacity: 1, scale: 1 };
      coverPosition = target
        ? { x: 0, y: 48 }
        : { x: 0, y: 0 };
    }
  }
  const isLandingDestination = Boolean(
    participates &&
      active?.phase === "landing" &&
      ((active.direction === "forward" && target) ||
        (active.direction === "return" && !target)),
  );
  const landingInitial =
    active?.direction === "return"
      ? {
          opacity: 0,
          scale: travelScale,
          x: travelX,
          y: travelY,
        }
      : { opacity: 0, scale: 0.9, x: 0, y: 48 };

  return (
    <motion.div
      className={className}
      data-case-cover-motion={transitionId}
      data-case-cover-role={target ? "target" : "source"}
      initial={isLandingDestination ? landingInitial : false}
      animate={{ ...coverAnimation, ...coverPosition }}
      style={{ transformOrigin: "50% 50%" }}
      transition={{
        opacity: {
          duration: landingMs / 1000,
          ease: landingOpacityEase,
        },
        scale: {
          duration:
            active?.phase === "takeoff"
              ? active.direction === "return" && target
                ? positionAnimationMs / 1000
                : positionAnimationMs / 1000
              : landingMs / 1000,
          ease:
            active?.phase === "takeoff"
              ? active.direction === "return" && target
                ? takeoffEase
                : takeoffEase
              : landingEase,
        },
        x: {
          duration:
            active?.phase === "takeoff"
              ? positionAnimationMs / 1000
              : landingMs / 1000,
          ease:
            active?.phase === "takeoff" ? takeoffEase : landingEase,
        },
        y: {
          duration:
            active?.phase === "takeoff"
              ? positionAnimationMs / 1000
              : landingMs / 1000,
          ease:
            active?.phase === "takeoff" ? takeoffEase : landingEase,
        },
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
