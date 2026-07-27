"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

const contextKey = "case-cover-transition-context";
const forwardRequest = "case-cover-transition-forward";
const returnRequest = "case-cover-transition-return";
const durationMs = 575;
const coverCrossfadeMs = 240;

type ViewMode = "birdview" | "snakeview";
type RectSnapshot = Pick<DOMRect, "left" | "top" | "width" | "height" | "bottom">;
type TransitionContext = {
  transitionId: string;
  href: string;
  homePath: string;
  sourceUrl: string;
  scrollY: number;
  view: ViewMode;
  caseRect?: RectSnapshot;
};
type ForwardDetail = {
  transitionId: string;
  href: string;
  homePath: string;
  source: HTMLElement;
  view: ViewMode;
};
type Phase = "idle" | "hold" | "forward" | "settle" | "return";

const normalizePath = (path: string) => path === "/" ? path : path.replace(/\/$/, "");
const snapshotRect = (rect: DOMRect): RectSnapshot => ({
  left: rect.left, top: rect.top, width: rect.width, height: rect.height, bottom: rect.bottom,
});
const targetSelector = (id: string) => `[data-case-cover-transition-target="${CSS.escape(id)}"]`;
const cardMediaSelector = (id: string) =>
  `[data-transition-project="${CSS.escape(id)}"] .project__img`;

function sourceUrl(source: HTMLElement) {
  const image = source.matches("img") ? source as HTMLImageElement : source.querySelector<HTMLImageElement>("img");
  return image?.currentSrc || image?.src || source.dataset.transitionPoster || "";
}

function visibleElement(selector: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find((element) => {
    const rect = element.getBoundingClientRect();
    return !element.closest(".view-layer--hidden") && rect.width > 0 && rect.height > 0;
  });
}

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

async function stableVisibleElement(selector: string) {
  await nextFrame();
  await nextFrame();
  return visibleElement(selector);
}

function waitForElement(selector: string, timeoutMs = 1600) {
  const existing = visibleElement(selector);
  if (existing) return Promise.resolve(existing);
  return new Promise<HTMLElement | null>((resolve) => {
    const observer = new MutationObserver(() => {
      const element = visibleElement(selector);
      if (!element) return;
      clearTimeout(timeout);
      observer.disconnect();
      resolve(element);
    });
    const timeout = window.setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

async function waitForTargetMedia(target: HTMLElement) {
  const image = target.querySelector<HTMLImageElement>("img");
  if (image) {
    try { await image.decode(); } catch { /* The rendered fallback remains usable. */ }
    return;
  }
  const video = target.querySelector<HTMLVideoElement>("video");
  if (!video) return;
  await new Promise<void>((resolve) => {
    let done = false;
    const settle = () => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      resolve();
    };
    const timeout = window.setTimeout(settle, 1400);
    const requestFrame = () => {
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(settle);
      else if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) settle();
    };
    video.addEventListener("loadeddata", requestFrame, { once: true });
    video.addEventListener("error", settle, { once: true });
    requestFrame();
  });
}

function readContext() {
  try {
    const raw = sessionStorage.getItem(contextKey);
    return raw ? JSON.parse(raw) as TransitionContext : null;
  } catch { return null; }
}

function writeContext(context: TransitionContext) {
  try { sessionStorage.setItem(contextKey, JSON.stringify(context)); } catch { /* Navigation still works. */ }
}

function makeOverlay(context: TransitionContext, rect: RectSnapshot) {
  const overlay = document.createElement("img");
  overlay.className = "case-transition__cover case-transition__layer";
  overlay.src = context.sourceUrl;
  overlay.alt = "";
  overlay.setAttribute("aria-hidden", "true");
  Object.assign(overlay.style, {
    left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
  });
  document.body.append(overlay);
  return overlay;
}

function makeTargetImageOverlay(target: HTMLElement, rect: RectSnapshot) {
  const image = target.querySelector<HTMLImageElement>("img");
  const url = image?.currentSrc || image?.src;
  if (!image || !url) return null;
  const overlay = document.createElement("img");
  const imageStyle = getComputedStyle(image);
  overlay.className = "case-transition__cover case-transition__layer";
  overlay.src = url;
  overlay.alt = "";
  overlay.setAttribute("aria-hidden", "true");
  Object.assign(overlay.style, {
    left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
    objectFit: imageStyle.objectFit,
    objectPosition: imageStyle.objectPosition,
    opacity: "0",
  });
  document.body.append(overlay);
  return overlay;
}

function animateRect(element: HTMLElement, from: RectSnapshot, to: RectSnapshot) {
  return element.animate([
    { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` },
    { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` },
  ], { duration: durationMs, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" })
    .finished.catch(() => undefined);
}

export function startCaseCoverTransition(detail: ForwardDetail) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return !dispatchEvent(new CustomEvent<ForwardDetail>(forwardRequest, { cancelable: true, detail }));
}

export function requestCaseCoverReturn() {
  return !dispatchEvent(new CustomEvent(returnRequest, { cancelable: true }));
}

export function CaseCoverTransitionController() {
  const pathname = usePathname();
  const router = useRouter();
  const phaseRef = useRef<Phase>("idle");
  const previousPathRef = useRef(normalizePath(pathname));
  const returnSourceRef = useRef<RectSnapshot | null>(null);
  const returnOffscreenRef = useRef(false);
  const cleanupTimerRef = useRef<number | null>(null);
  const returnLayoutTimerRef = useRef<number | null>(null);
  const beginReturnRef = useRef<() => boolean>(() => false);

  function cleanup(removeContext = false, preserveReturnLayout = false) {
    if (cleanupTimerRef.current !== null) clearTimeout(cleanupTimerRef.current);
    if (returnLayoutTimerRef.current !== null) clearTimeout(returnLayoutTimerRef.current);
    cleanupTimerRef.current = null;
    returnLayoutTimerRef.current = null;
    document.querySelectorAll(".case-transition__layer").forEach((node) => node.remove());
    document.documentElement.classList.remove("case-transition-active", "case-transition-media-ready");
    if (preserveReturnLayout) {
      returnLayoutTimerRef.current = window.setTimeout(() => {
        document.documentElement.classList.remove("case-transition-returning");
        returnLayoutTimerRef.current = null;
      }, 1800);
    } else {
      document.documentElement.classList.remove("case-transition-returning");
    }
    document.querySelector<HTMLElement>(".case-page-shell")
      ?.removeAttribute("data-case-cover-transition-text");
    document.querySelector<HTMLElement>("main#main-content")?.style.removeProperty("z-index");
    document.body.style.removeProperty("overflow");
    if (removeContext) sessionStorage.removeItem(contextKey);
    phaseRef.current = "idle";
  }

  useLayoutEffect(() => {
    beginReturnRef.current = () => {
      const context = readContext();
      if (!context) return false;
      if (phaseRef.current !== "idle") cleanup();
      const source = visibleElement(targetSelector(context.transitionId));
      const rect = source ? snapshotRect(source.getBoundingClientRect()) : context.caseRect;
      if (!rect) return false;
      returnSourceRef.current = rect;
      returnOffscreenRef.current = rect.bottom < 0 || rect.top > innerHeight;
      phaseRef.current = "return";
      document.documentElement.classList.add("case-transition-active", "case-transition-returning");
      document.body.style.overflow = "hidden";
      const blackout = document.createElement("div");
      blackout.className = "case-transition__blackout case-transition__layer";
      blackout.setAttribute("aria-hidden", "true");
      document.body.append(blackout);
      makeOverlay(context, rect);
      cleanupTimerRef.current = window.setTimeout(() => cleanup(), 2800);
      return true;
    };
  });

  useEffect(() => {
    const forward = (event: Event) => {
      const request = event as CustomEvent<ForwardDetail>;
      if (phaseRef.current !== "idle") return;
      const rect = snapshotRect(request.detail.source.getBoundingClientRect());
      const imageUrl = sourceUrl(request.detail.source);
      if (!rect.width || !rect.height || !imageUrl) return;
      event.preventDefault();
      const context: TransitionContext = {
        transitionId: request.detail.transitionId,
        href: request.detail.href,
        homePath: request.detail.homePath,
        sourceUrl: imageUrl,
        scrollY,
        view: request.detail.view,
      };
      writeContext(context);
      const backdrop = document.createElement("div");
      backdrop.className = "case-transition__backdrop case-transition__layer";
      backdrop.setAttribute("aria-hidden", "true");
      const main = document.querySelector<HTMLElement>("main#main-content");
      if (main) {
        const clone = main.cloneNode(true) as HTMLElement;
        clone.removeAttribute("id");
        clone.style.transform = `translateY(${-scrollY}px)`;
        backdrop.append(clone);
      }
      document.body.append(backdrop);
      backdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: durationMs, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards",
      });
      makeOverlay(context, rect);
      document.documentElement.classList.add("case-transition-active");
      document.body.style.overflow = "hidden";
      phaseRef.current = "hold";
      backdrop.querySelectorAll<HTMLElement>(".project").forEach((card) => {
        if (card.dataset.transitionProject === context.transitionId) return;
        card.animate([{ filter: "blur(0px)", opacity: 1 }, { filter: "blur(48px)", opacity: 0 }], {
          duration: durationMs, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards",
        });
      });
      cleanupTimerRef.current = window.setTimeout(() => cleanup(), 2800);
      window.setTimeout(() => router.push(context.href), 60);
    };
    const returnHome = (event: Event) => {
      const context = readContext();
      if (!context || !beginReturnRef.current()) return;
      event.preventDefault();
      router.push(context.homePath, { scroll: false });
    };
    const popstate = () => {
      const context = readContext();
      if (context && normalizePath(pathname) === normalizePath(context.href)) beginReturnRef.current();
    };
    addEventListener(forwardRequest, forward);
    addEventListener(returnRequest, returnHome);
    addEventListener("popstate", popstate);
    return () => {
      removeEventListener(forwardRequest, forward);
      removeEventListener(returnRequest, returnHome);
      removeEventListener("popstate", popstate);
    };
  }, [pathname, router]);

  useLayoutEffect(() => {
    const path = normalizePath(pathname);
    const context = readContext();
    if (!context) {
      previousPathRef.current = path;
      return;
    }
    if (path === normalizePath(context.homePath) && previousPathRef.current === normalizePath(context.href) && phaseRef.current === "idle") {
      beginReturnRef.current();
    }
    if (path === normalizePath(context.href) && phaseRef.current === "hold") {
      phaseRef.current = "forward";
      void waitForElement(targetSelector(context.transitionId)).then(async (target) => {
        const overlay = document.querySelector<HTMLElement>(".case-transition__cover");
        if (!target || !overlay) return cleanup();
        scrollTo({ top: 0, behavior: "instant" });
        const rect = snapshotRect(target.getBoundingClientRect());
        writeContext({ ...context, caseRect: rect });
        const page = target.closest<HTMLElement>(".case-page-shell");
        window.setTimeout(() => page?.setAttribute("data-case-cover-transition-text", "revealing"), 300);
        const startRect = snapshotRect(overlay.getBoundingClientRect());
        await waitForTargetMedia(target);
        const targetOverlay = makeTargetImageOverlay(target, startRect);
        if (targetOverlay) {
          await Promise.all([
            animateRect(overlay, startRect, rect),
            animateRect(targetOverlay, startRect, rect),
            overlay.animate([
              { opacity: 1, offset: 0 },
              { opacity: 1, offset: 0.58 },
              { opacity: 0, offset: 1 },
            ], { duration: durationMs, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" }).finished,
            targetOverlay.animate([
              { opacity: 0, offset: 0 },
              { opacity: 0, offset: 0.58 },
              { opacity: 1, offset: 1 },
            ], { duration: durationMs, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" }).finished,
          ]).catch(() => undefined);
          document.documentElement.classList.add("case-transition-media-ready");
          targetOverlay.remove();
          cleanup();
          return;
        }
        await animateRect(overlay, startRect, rect);
        phaseRef.current = "settle";
        document.documentElement.classList.add("case-transition-media-ready");
        const crossfadeTiming: KeyframeAnimationOptions = {
          duration: coverCrossfadeMs,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          fill: "forwards",
        };
        await Promise.all([
          overlay.animate([{ opacity: 1 }, { opacity: 0 }], crossfadeTiming).finished,
          target.animate([{ opacity: 0 }, { opacity: 1 }], crossfadeTiming).finished,
        ]).catch(() => undefined);
        document.documentElement.classList.remove("case-transition-media-ready");
        cleanup();
      });
    }
    if (path === normalizePath(context.homePath) && phaseRef.current === "return") {
      document.documentElement.dataset.portfolioView = context.view;
      localStorage.setItem("portfolio-view", context.view);
      scrollTo({ top: context.scrollY, behavior: "instant" });
      const selector = cardMediaSelector(context.transitionId);
      void waitForElement(selector).then(async () => {
        const target = await stableVisibleElement(selector);
        const overlay = document.querySelector<HTMLElement>(".case-transition__cover");
        const source = returnSourceRef.current;
        if (!target || !overlay || !source) return cleanup(true);
        scrollTo({ top: context.scrollY, behavior: "instant" });
        const destination = snapshotRect(target.getBoundingClientRect());
        target.style.opacity = "0";
        document.querySelector<HTMLElement>("main#main-content")?.querySelectorAll<HTMLElement>(".project").forEach((card) => {
          if (card.dataset.transitionProject === context.transitionId) return;
          card.animate([{ filter: "blur(48px)", opacity: 0 }, { filter: "blur(0px)", opacity: 1 }], {
            duration: durationMs, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards",
          });
        });
        if (returnOffscreenRef.current) {
          Object.assign(overlay.style, {
            left: `${destination.left}px`, top: `${destination.top}px`,
            width: `${destination.width}px`, height: `${destination.height}px`, opacity: "0",
            transformOrigin: "center",
          });
          await overlay.animate([
            { opacity: 0, transform: "scale(1.2)", filter: "blur(12px)" },
            { opacity: 1, transform: "scale(1)", filter: "blur(0px)" },
          ], {
            duration: 200,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            fill: "forwards",
          }).finished.catch(() => undefined);
        } else await animateRect(overlay, source, destination);
        await waitForTargetMedia(target);
        const video = target.querySelector<HTMLElement>(".optimized-video");
        video?.classList.add("case-transition-card-handoff");
        target.style.removeProperty("opacity");
        cleanup(true, true);
        if (video) {
          window.setTimeout(() => video.classList.remove("case-transition-card-handoff"), 300);
        }
      });
    }
    previousPathRef.current = path;
  }, [pathname]);

  useEffect(() => () => cleanup(), []);
  return null;
}
