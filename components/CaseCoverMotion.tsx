"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext, type MouseEvent as ReactMouseEvent, type ReactNode,
  useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from "react";
import { spring as createSpring, type AnimationPlaybackControls } from "motion";
import { animate } from "motion/mini";
import { useReducedMotion } from "motion/react";
import {
  type CoverRect, coverRectsMatch, getCoverTransform, getOffscreenReturnTransform,
  nextMotionFrame, settledCoverTransform, snapshotCoverRect, waitForCoverImages,
} from "@/lib/case-cover-motion";

type ViewMode = "birdview" | "snakeview";
type Direction = "forward" | "return";
type TransitionPhase = "preflight" | "landing" | "handoff" | "fallback";
type TransitionSnapshot = {
  transitionId: string;
  casePath: string;
  homePath: string;
  scrollY: number;
  view: ViewMode;
  sourceCoverRect?: CoverRect;
};
type ActiveTransition = TransitionSnapshot & {
  token: number;
  direction: Direction;
  phase: TransitionPhase;
  offscreenReturn: boolean;
  destinationCoverRect?: CoverRect;
};
type CaseCoverActions = {
  registerCoverContent: (id: string, target: boolean, content: ReactNode) => void;
  openCase: (
    event: ReactMouseEvent<HTMLAnchorElement>,
    snapshot: Omit<TransitionSnapshot, "scrollY" | "sourceCoverRect">,
  ) => boolean;
  returnHome: (event: ReactMouseEvent<HTMLAnchorElement>) => boolean;
};
type CaseCoverMotionContextValue = CaseCoverActions & { active: ActiveTransition | null };

const storageKey = "case-cover-motion-snapshot";
const recoveryTimeoutMs = 5000;
const preparationAttempts = 30;
const coverFadeSeconds = 0.12;
const springDuration = { forward: 0.55, return: 0.45, offscreen: 0.32 };
const CaseCoverMotionContext = createContext<CaseCoverMotionContextValue | null>(null);
// Registration does not subscribe every media component to phase changes.
const CaseCoverActionsContext = createContext<CaseCoverActions | null>(null);

function normalizedPath(path: string) {
  return path.replace(/\/$/, "");
}

function isPlainPrimaryClick(event: ReactMouseEvent<HTMLAnchorElement>) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey &&
    !event.shiftKey && !event.altKey;
}

function readSnapshot(): TransitionSnapshot | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
    if (!value || typeof value.transitionId !== "string" ||
      typeof value.casePath !== "string" || typeof value.homePath !== "string" ||
      !Number.isFinite(value.scrollY) ||
      !["birdview", "snakeview"].includes(value.view)) return null;
    return value;
  } catch {
    return null;
  }
}

function writeSnapshot(snapshot: TransitionSnapshot) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
  } catch {
    // The in-memory snapshot also works when storage is blocked.
  }
}

function applyTransitionAttributes(active: ActiveTransition | null) {
  const root = document.documentElement;
  root.toggleAttribute("data-case-cover-motion-active", Boolean(active));
  if (active) {
    root.dataset.caseCoverMotionDirection = active.direction;
    root.dataset.caseCoverMotionPhase = active.phase;
    root.dataset.caseCoverMotionId = active.transitionId;
    root.toggleAttribute("data-case-cover-motion-offscreen", active.offscreenReturn);
  } else {
    delete root.dataset.caseCoverMotionDirection;
    delete root.dataset.caseCoverMotionPhase;
    delete root.dataset.caseCoverMotionId;
    root.removeAttribute("data-case-cover-motion-offscreen");
  }
}

function getVisibleCover(id: string, role: "source" | "target") {
  const selector = `[data-case-cover-motion="${CSS.escape(id)}"][data-case-cover-role="${role}"]`;
  return [...document.querySelectorAll<HTMLElement>(selector)].find((element) => {
    const viewLayer = element.closest(".view-layer");
    return (!viewLayer || viewLayer.classList.contains("view-layer--current")) &&
      element.getBoundingClientRect().width > 0;
  });
}

function isInViewport(element: Element) {
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight &&
    rect.right > 0 && rect.left < window.innerWidth;
}

export function CaseCoverMotionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState<ActiveTransition | null>(null);
  const [content, setContent] = useState<ReactNode | null>(null);
  const [replacementContent, setReplacementContent] = useState<ReactNode | null>(null);
  const activeRef = useRef<ActiveTransition | null>(null);
  const lastSnapshotRef = useRef<TransitionSnapshot | null>(null);
  const nextTokenRef = useRef(0);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationFrameRef = useRef<number | null>(null);
  const registryRef = useRef(new Map<string, { source?: ReactNode; target?: ReactNode }>());

  const setTransition = useCallback((next: ActiveTransition | null) => {
    activeRef.current = next;
    setActive(next);
  }, []);

  // Publish visibility only after the child layer initializes its animations.
  // Changing attributes in a preparation RAF could otherwise paint the new
  // route before React commits the corresponding landing state.
  useLayoutEffect(() => applyTransitionAttributes(active), [active]);

  const complete = useCallback((token: number) => {
    if (activeRef.current?.token !== token) return;
    if (activeRef.current.direction === "return") {
      lastSnapshotRef.current = null;
      try { sessionStorage.removeItem(storageKey); } catch { /* Storage is optional. */ }
    }
    if (recoveryTimerRef.current !== null) clearTimeout(recoveryTimerRef.current);
    if (navigationFrameRef.current !== null) cancelAnimationFrame(navigationFrameRef.current);
    recoveryTimerRef.current = null;
    navigationFrameRef.current = null;
    setTransition(null);
    setContent(null);
    setReplacementContent(null);
  }, [setTransition]);

  const begin = useCallback((
    snapshot: TransitionSnapshot, direction: Direction,
    sourceCoverRect?: CoverRect, offscreenReturn = false,
  ) => {
    const registered = registryRef.current.get(snapshot.transitionId);
    const token = ++nextTokenRef.current;
    setContent(registered?.source ?? registered?.target ?? null);
    setReplacementContent(direction === "forward" ? registered?.target ?? null : null);
    setTransition({
      ...snapshot, token, direction, phase: "preflight", sourceCoverRect, offscreenReturn,
      destinationCoverRect: direction === "return" ? snapshot.sourceCoverRect : undefined,
    });
    // Recovery only. Normal completion belongs to the animation, never this clock.
    recoveryTimerRef.current = setTimeout(() => complete(token), recoveryTimeoutMs);
    return token;
  }, [complete, setTransition]);

  const navigate = useCallback((path: string, token: number) => {
    navigationFrameRef.current = requestAnimationFrame(() => {
      navigationFrameRef.current = null;
      if (activeRef.current?.token === token) router.push(path, { scroll: false });
    });
  }, [router]);

  const registerCoverContent = useCallback((id: string, target: boolean, node: ReactNode) => {
    registryRef.current.set(id, {
      ...registryRef.current.get(id), ...(target ? { target: node } : { source: node }),
    });
    if (target && activeRef.current?.direction === "forward" &&
      activeRef.current.transitionId === id) {
      setReplacementContent((current) => current ?? node);
    }
  }, []);

  const openCase = useCallback<CaseCoverActions["openCase"]>((event, snapshot) => {
    if (!isPlainPrimaryClick(event) || reduceMotion) return false;
    if (activeRef.current) return true;
    const cover = event.currentTarget.querySelector<HTMLElement>(
      `[data-case-cover-motion="${CSS.escape(snapshot.transitionId)}"]`,
    );
    const rect = cover?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return false;
    event.preventDefault();
    const nextSnapshot = { ...snapshot, scrollY: window.scrollY, sourceCoverRect: snapshotCoverRect(rect) };
    lastSnapshotRef.current = nextSnapshot;
    writeSnapshot(nextSnapshot);
    const token = begin(nextSnapshot, "forward", nextSnapshot.sourceCoverRect);
    navigate(snapshot.casePath, token);
    return true;
  }, [begin, navigate, reduceMotion]);

  const prepareReturn = useCallback((snapshot: TransitionSnapshot, offscreen = false) => {
    document.documentElement.dataset.portfolioView = snapshot.view;
    try { localStorage.setItem("portfolio-view", snapshot.view); } catch { /* In-memory view still restores. */ }
    const cover = getVisibleCover(snapshot.transitionId, "target");
    const visible = !offscreen && cover && isInViewport(cover);
    return begin(snapshot, "return", visible ? snapshotCoverRect(cover.getBoundingClientRect()) : undefined, !visible);
  }, [begin]);

  const returnHome = useCallback<CaseCoverActions["returnHome"]>((event) => {
    if (!isPlainPrimaryClick(event)) return false;
    if (activeRef.current) {
      event.preventDefault();
      return true;
    }
    const snapshot = lastSnapshotRef.current ?? readSnapshot();
    if (!snapshot || reduceMotion || normalizedPath(window.location.pathname) !== normalizedPath(snapshot.casePath)) return false;
    event.preventDefault();
    const token = prepareReturn(snapshot);
    navigate(snapshot.homePath, token);
    return true;
  }, [navigate, prepareReturn, reduceMotion]);

  useEffect(() => {
    const handlePopState = () => {
      // History takes priority over a flight, including its pending router push.
      if (activeRef.current) {
        complete(activeRef.current.token);
        return;
      }
      const snapshot = lastSnapshotRef.current ?? readSnapshot();
      if (!reduceMotion && snapshot && normalizedPath(window.location.pathname) === normalizedPath(snapshot.homePath)) {
        prepareReturn(snapshot, true);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [complete, prepareReturn, reduceMotion]);

  useLayoutEffect(() => {
    if (!active) return;
    const destinationPath = active.direction === "forward" ? active.casePath : active.homePath;
    const sourcePath = active.direction === "forward" ? active.homePath : active.casePath;
    if (normalizedPath(pathname) !== normalizedPath(destinationPath)) {
      if (normalizedPath(pathname) !== normalizedPath(sourcePath)) complete(active.token);
      return;
    }
    if (active.phase !== "preflight") return;
    const controller = new AbortController();
    const { signal } = controller;
    const prepare = async () => {
      const scrollY = active.direction === "forward" ? 0 : active.scrollY;
      let previous: CoverRect | undefined;
      for (let attempt = 0; attempt < preparationAttempts; attempt += 1) {
        // The homepage applies its selected view in a layout effect. Restore and
        // measure afterward, while the canvas still has its natural geometry.
        window.scrollTo({ top: scrollY, behavior: "instant" });
        if (!await nextMotionFrame(signal)) return;
        const cover = getVisibleCover(active.transitionId, active.direction === "forward" ? "target" : "source");
        const rect = cover?.getBoundingClientRect();
        if (rect?.width && rect.height) {
          const measured = snapshotCoverRect(rect);
          if (previous && coverRectsMatch(previous, measured)) {
            if (activeRef.current?.token !== active.token || signal.aborted) return;
            setTransition({ ...active, phase: "landing", destinationCoverRect: measured });
            return;
          }
          previous = measured;
        }
      }
      if (!signal.aborted && activeRef.current?.token === active.token) {
        setTransition({ ...active, phase: "fallback" });
      }
    };
    void prepare();
    return () => controller.abort();
  }, [active, complete, pathname, setTransition]);

  const finishMotion = useCallback((token: number) => {
    const current = activeRef.current;
    if (current?.token === token) setTransition({ ...current, phase: "handoff" });
  }, [setTransition]);

  useLayoutEffect(() => {
    if (active?.phase !== "handoff") return;
    const controller = new AbortController();
    void (async () => {
      // Real cover and overlay share one painted frame before overlay removal.
      if (await nextMotionFrame(controller.signal) && await nextMotionFrame(controller.signal)) complete(active.token);
    })();
    return () => controller.abort();
  }, [active, complete]);

  useEffect(() => {
    if (reduceMotion && activeRef.current) complete(activeRef.current.token);
  }, [complete, reduceMotion]);

  useEffect(() => () => {
    if (recoveryTimerRef.current !== null) clearTimeout(recoveryTimerRef.current);
    if (navigationFrameRef.current !== null) cancelAnimationFrame(navigationFrameRef.current);
    applyTransitionAttributes(null);
  }, []);

  const actions = useMemo(() => ({ registerCoverContent, openCase, returnHome }), [registerCoverContent, openCase, returnHome]);
  const context = useMemo(() => ({ ...actions, active }), [actions, active]);
  return (
    <CaseCoverActionsContext.Provider value={actions}>
      <CaseCoverMotionContext.Provider value={context}>
        {children}
        {active ? <CaseCoverTransitionLayer
          key={active.token} active={active} content={content}
          replacementContent={replacementContent} onFinish={finishMotion}
        /> : null}
      </CaseCoverMotionContext.Provider>
    </CaseCoverActionsContext.Provider>
  );
}

export function CaseMotionRoutes({ children }: { children: ReactNode }) {
  return <div className="case-motion-route">{children}</div>;
}

function CaseCoverTransitionLayer({ active, content, replacementContent, onFinish }: {
  active: ActiveTransition;
  content: ReactNode | null;
  replacementContent: ReactNode | null;
  onFinish: (token: number) => void;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const replacementRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const layoutRect = active.destinationCoverRect ?? active.sourceCoverRect;
  const initialTransform = layoutRect
    ? active.offscreenReturn ? getOffscreenReturnTransform(layoutRect)
      : active.sourceCoverRect ? getCoverTransform(active.sourceCoverRect, layoutRect) : settledCoverTransform
    : settledCoverTransform;

  useLayoutEffect(() => {
    if (active.phase !== "landing" && active.phase !== "fallback") return;
    const controller = new AbortController();
    const { signal } = controller;
    const animations: AnimationPlaybackControls[] = [];
    const styleCleanup: (() => void)[] = [];
    const duration = active.offscreenReturn ? springDuration.offscreen : springDuration[active.direction];
    // The native mini path preserves CSS `none` and does not register transient
    // transforms in the React motion component's persistent MotionValues.
    const spring = { type: createSpring, bounce: 0, duration };
    const layer = layerRef.current;
    const backdrop = backdropRef.current;
    const source = sourceRef.current;
    const replacement = replacementRef.current;
    const destination = getVisibleCover(active.transitionId, active.direction === "forward" ? "target" : "source");
    const track = (animation: AnimationPlaybackControls) => {
      animations.push(animation);
      return animation.finished;
    };
    const preserveStyles = (element: HTMLElement, properties: string[]) => {
      const previous = properties.map((property) => [property, element.style.getPropertyValue(property)]);
      styleCleanup.push(() => previous.forEach(([property, value]) => {
        if (value) element.style.setProperty(property, value);
        else element.style.removeProperty(property);
      }));
    };

    const run = async () => {
      if (active.phase === "fallback" || !layer || !destination || !layoutRect || !content) {
        if (layer) await track(animate(layer, { opacity: [1, 0] }, { duration: 0.18 }));
        if (!signal.aborted) onFinish(active.token);
        return;
      }
      const sceneAnimations: Promise<unknown>[] = [];
      const projects = active.direction === "return"
        ? document.querySelector<HTMLElement>(".view-layer--current .projects") : null;
      if (projects) {
        const rect = projects.getBoundingClientRect();
        preserveStyles(projects, ["transform", "transform-origin", "opacity"]);
        projects.style.transformOrigin = `${window.innerWidth / 2 - rect.left}px ${window.innerHeight / 2 - rect.top}px`;
        sceneAnimations.push(track(animate(projects, {
          // `none` also releases the containing block for viewport-fixed cursors.
          transform: ["scale(0.94)", "none"], opacity: [0.33, 1],
        }, spring)));
      }
      if (active.direction === "forward") {
        const blocks = [...document.querySelectorAll<HTMLElement>(".case-page-shell .case-title, .case-page-shell .case-content > *")].filter(isInViewport);
        for (const block of blocks) {
          preserveStyles(block, ["opacity", "transform"]);
          sceneAnimations.push(track(animate(block, {
            opacity: [0, 1], transform: ["translateY(6px)", "none"],
          }, { ...spring, duration: duration * 0.8, delay: duration * 0.15 })));
        }
      }
      if (backdrop) sceneAnimations.push(track(animate(backdrop, { opacity: [1, 0] }, { duration, ease: "easeInOut" })));
      // Full transform goes through Motion's native DOM animation path. No RAF
      // writes to inherited root variables and no React updates per frame.
      const geometryFinished = track(animate(layer, {
        transform: [initialTransform, settledCoverTransform],
      }, spring));
      const crossfadeFinished = (async () => {
        if (active.direction !== "forward" || !source || !replacement) return;
        const ready = await Promise.all([
          waitForCoverImages(replacement, signal), waitForCoverImages(destination, signal),
        ]);
        if (signal.aborted) return;
        if (!ready.every(Boolean)) {
          await geometryFinished;
          if (!signal.aborted) {
            preserveStyles(destination, ["visibility"]);
            destination.style.visibility = "visible";
            await track(animate(layer, { opacity: [1, 0] }, { duration: coverFadeSeconds }));
          }
          return;
        }
        // Establish spatial movement before swapping different card/hero artwork.
        if (!await nextMotionFrame(signal) || !await nextMotionFrame(signal)) return;
        await Promise.all([
          track(animate(source, { opacity: [1, 0] }, { duration: coverFadeSeconds })),
          track(animate(replacement, { opacity: [0, 1] }, { duration: coverFadeSeconds })),
        ]);
      })();
      await Promise.all([geometryFinished, crossfadeFinished, ...sceneAnimations]);
      if (!signal.aborted) onFinish(active.token);
    };
    void run().catch(() => {
      if (!signal.aborted) onFinish(active.token);
    });
    return () => {
      controller.abort();
      // cancel() avoids Motion's deferred stop() sample reapplying partial
      // transforms after route-owned styles have been restored on browser Back.
      const overlayStyles = [layer, source, replacement, backdrop].flatMap((element) => {
        if (!element) return [];
        const style = getComputedStyle(element);
        return [{ element, transform: style.transform, opacity: style.opacity }];
      });
      animations.forEach((animation) => animation.cancel());
      overlayStyles.forEach(({ element, transform, opacity }) => {
        element.style.transform = transform;
        element.style.opacity = opacity;
      });
      styleCleanup.forEach((cleanup) => cleanup());
    };
  }, [active, content, replacementContent, initialTransform, layoutRect, onFinish]);

  return (
    <>
      <div ref={backdropRef} className="case-cover-motion-backdrop" aria-hidden="true" />
      {content && layoutRect ? <div ref={layerRef} className="case-cover-motion-layer" aria-hidden="true"
        style={{ left: layoutRect.left, top: layoutRect.top, width: layoutRect.width,
          height: layoutRect.height, transform: initialTransform }}
      >
        <div ref={sourceRef} className="case-cover-motion-layer__content">{content}</div>
        {replacementContent ? <div ref={replacementRef}
          className="case-cover-motion-layer__content case-cover-motion-layer__content--replacement"
        >{replacementContent}</div> : null}
      </div> : null}
    </>
  );
}

export function SharedCaseCover({ transitionId, enabled = true, target = false, transitionTarget, className, children }: {
  transitionId?: string;
  enabled?: boolean;
  target?: boolean;
  transitionTarget?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const actions = useContext(CaseCoverActionsContext);
  const coverRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const registerCoverContent = actions?.registerCoverContent;
  const hasTransitionTarget = Boolean(transitionTarget);
  useLayoutEffect(() => {
    if (!transitionId || !enabled || !registerCoverContent) return;
    registerCoverContent(transitionId, target, children);
    if (!target && transitionTarget) registerCoverContent(transitionId, true, transitionTarget);
  }, [children, enabled, registerCoverContent, target, transitionId, transitionTarget]);

  useEffect(() => {
    const cover = coverRef.current;
    if (!cover || !enabled || target || !hasTransitionTarget) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: "200px 0px" });
    observer.observe(cover);
    return () => observer.disconnect();
  }, [enabled, target, hasTransitionTarget]);

  return (
    <div ref={coverRef} className={className}
      data-case-cover-motion={transitionId} data-case-cover-role={target ? "target" : "source"}
    >
      {children}
      {enabled && nearViewport && !target && transitionTarget ? (
        <span className="shared-case-cover__target-preload" aria-hidden="true">{transitionTarget}</span>
      ) : null}
    </div>
  );
}

export function useCaseCoverMotion() {
  const value = useContext(CaseCoverMotionContext);
  if (!value) throw new Error("useCaseCoverMotion must be used inside CaseCoverMotionProvider");
  return value;
}
