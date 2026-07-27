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
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";

type ViewMode = "birdview" | "snakeview";
type Direction = "forward" | "return";
type TransitionSnapshot = {
  transitionId: string;
  casePath: string;
  homePath: string;
  scrollY: number;
  view: ViewMode;
};
type ActiveTransition = TransitionSnapshot & {
  direction: Direction;
  offscreenReturn?: boolean;
};

const storageKey = "case-cover-motion-snapshot";
const durationSeconds = 0.575;
const ease = [0.16, 1, 0.3, 1] as const;

type CaseCoverMotionContextValue = {
  active: ActiveTransition | null;
  openCase: (
    event: ReactMouseEvent<HTMLAnchorElement>,
    snapshot: Omit<TransitionSnapshot, "scrollY">,
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
      document.documentElement.toggleAttribute(
        "data-case-cover-motion-offscreen",
        Boolean(next.offscreenReturn),
      );
    } else {
      delete document.documentElement.dataset.caseCoverMotionDirection;
      delete document.documentElement.dataset.caseCoverMotionId;
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

  const armFallback = useCallback(() => {
    if (completionTimerRef.current !== null) {
      window.clearTimeout(completionTimerRef.current);
    }
    completionTimerRef.current = window.setTimeout(
      complete,
      reduceMotion ? 50 : 850,
    );
  }, [complete, reduceMotion]);

  const openCase = useCallback(
    (
      event: ReactMouseEvent<HTMLAnchorElement>,
      snapshot: Omit<TransitionSnapshot, "scrollY">,
    ) => {
      const isPlainPrimaryClick =
        event.button === 0 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey;
      if (!isPlainPrimaryClick || reduceMotion) return false;
      if (activeRef.current) return true;

      const nextSnapshot = { ...snapshot, scrollY: window.scrollY };
      writeSnapshot(nextSnapshot);
      setTransition({ ...nextSnapshot, direction: "forward" });
      armFallback();
      router.push(snapshot.casePath, { scroll: false });
      return true;
    },
    [armFallback, reduceMotion, router, setTransition],
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
    setTransition({ ...snapshot, direction: "return", offscreenReturn });
    armFallback();
    router.push(snapshot.homePath, { scroll: false });
    return true;
  }, [armFallback, reduceMotion, router, setTransition]);

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
        offscreenReturn: Boolean(
          coverRect &&
            (coverRect.bottom < 0 || coverRect.top > window.innerHeight),
        ),
      });
      armFallback();
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
    }
    if (
      current.direction === "return" &&
      normalizedPath === current.homePath.replace(/\/$/, "")
    ) {
      window.scrollTo({ top: current.scrollY, behavior: "instant" });
    }
  }, [pathname]);

  useEffect(
    () => () => {
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current);
      }
      document.documentElement.removeAttribute("data-case-cover-motion-active");
      delete document.documentElement.dataset.caseCoverMotionDirection;
      delete document.documentElement.dataset.caseCoverMotionId;
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
      <LayoutGroup id="case-cover-motion">{children}</LayoutGroup>
    </CaseCoverMotionContext.Provider>
  );
}

export function CaseMotionRoutes({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.div
        key={pathname}
        className="case-motion-route"
        initial={false}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: durationSeconds, ease }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function SharedCaseCover({
  transitionId,
  enabled = true,
  className,
  children,
}: {
  transitionId?: string;
  enabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const { active } = useCaseCoverMotion();
  const reduceMotion = useReducedMotion();
  const participates =
    Boolean(transitionId) &&
    enabled &&
    !(active?.direction === "return" && active.offscreenReturn) &&
    (!active || active.transitionId === transitionId);

  return (
    <motion.div
      className={className}
      data-case-cover-motion={transitionId}
      layoutId={
        participates && !reduceMotion
          ? `case-cover-${transitionId}`
          : undefined
      }
      transition={{ layout: { duration: durationSeconds, ease } }}
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
