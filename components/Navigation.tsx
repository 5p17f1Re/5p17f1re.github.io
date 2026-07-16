"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { EmailButton } from "./EmailButton";

export type PortfolioViewMode = "birdview" | "snakeview";

type HomeNavigationControls = {
  view: PortfolioViewMode;
  busy: boolean;
  toggleView?: () => void;
};

type NavigationViewControls = {
  view: PortfolioViewMode;
  busy: boolean;
  toggleView: () => void;
};

type RegisterHomeNavigation = (
  controls: NavigationViewControls | null,
) => void;

const portfolioScrollPositionKey = "portfolio-scroll-position";
const navigationTransitionDurationMs = 200;
const NavigationRegistrationContext =
  createContext<RegisterHomeNavigation | null>(null);

function writeSessionValue(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Navigation still works when storage is unavailable.
  }
}

function readSessionValue(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function rememberPortfolioScrollPosition() {
  writeSessionValue(portfolioScrollPositionKey, String(window.scrollY));
}

export function useNavigationViewControls({
  view,
  busy,
  toggleView,
}: NavigationViewControls) {
  const register = useContext(NavigationRegistrationContext);
  const toggleViewRef = useRef(toggleView);

  if (!register) {
    throw new Error(
      "useNavigationViewControls must be used inside NavigationShell",
    );
  }

  useLayoutEffect(() => {
    toggleViewRef.current = toggleView;
  }, [toggleView]);

  const handleToggleView = useCallback(() => {
    toggleViewRef.current();
  }, []);

  useLayoutEffect(() => {
    register({ view, busy, toggleView: handleToggleView });
  }, [busy, handleToggleView, register, view]);

  useEffect(
    () => () => {
      register(null);
    },
    [register],
  );
}

function easeOutQuint(progress: number) {
  return 1 - Math.pow(1 - progress, 5);
}

function findNavigationItem(target: EventTarget | null) {
  return target instanceof Element
    ? target.closest<HTMLElement>("[data-nav-item]")
    : null;
}

function Navigation({ controls }: { controls: HomeNavigationControls }) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";
  const navigationRef = useRef<HTMLElement>(null);
  const cancelScrollAnimationRef = useRef<() => void>(() => undefined);
  const hoveredNavigationItemRef = useRef<HTMLElement | null>(null);
  const focusedNavigationItemRef = useRef<HTMLElement | null>(null);
  const [isAtPortfolioTop, setIsAtPortfolioTop] = useState(true);

  const showNavigationIndicator = useCallback(
    (navigationItem: HTMLElement | null) => {
      const navigation = navigationRef.current;

      if (!navigation || !navigationItem) {
        if (navigation) navigation.dataset.indicatorVisible = "false";
        return;
      }

      const navigationRect = navigation.getBoundingClientRect();
      const navigationItemRect = navigationItem.getBoundingClientRect();
      const isIndicatorReentering =
        navigation.dataset.indicatorVisible !== "true";

      if (isIndicatorReentering) {
        navigation.dataset.indicatorReentering = "true";
      }

      navigation.style.setProperty(
        "--nav-indicator-x",
        `${navigationItemRect.left - navigationRect.left}px`,
      );
      navigation.style.setProperty(
        "--nav-indicator-width",
        `${navigationItemRect.width}px`,
      );

      if (isIndicatorReentering) {
        navigation.getBoundingClientRect();
        delete navigation.dataset.indicatorReentering;
      }

      navigation.dataset.indicatorVisible = "true";
    },
    [],
  );

  const refreshNavigationIndicator = useCallback(() => {
    const hoveredNavigationItem = hoveredNavigationItemRef.current;

    if (hoveredNavigationItem) {
      const hoverCanActivate = !(
        hoveredNavigationItem.dataset.navHome === "true" &&
        isHome &&
        isAtPortfolioTop
      );
      showNavigationIndicator(
        hoverCanActivate ? hoveredNavigationItem : null,
      );
      return;
    }

    showNavigationIndicator(focusedNavigationItemRef.current);
  }, [isAtPortfolioTop, isHome, showNavigationIndicator]);

  useEffect(() => {
    if (!isHome) return;

    function updatePortfolioTopState() {
      setIsAtPortfolioTop(window.scrollY <= 1);
    }

    const animationFrame = requestAnimationFrame(updatePortfolioTopState);
    window.addEventListener("scroll", updatePortfolioTopState, {
      passive: true,
    });

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updatePortfolioTopState);
    };
  }, [isHome]);

  useLayoutEffect(() => {
    refreshNavigationIndicator();
  }, [controls.view, isHome, refreshNavigationIndicator]);

  useEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation) return;

    const resizeObserver = new ResizeObserver(refreshNavigationIndicator);
    resizeObserver.observe(navigation);

    return () => {
      resizeObserver.disconnect();
    };
  }, [refreshNavigationIndicator]);

  useEffect(
    () => () => {
      cancelScrollAnimationRef.current();
    },
    [],
  );

  function scrollToPortfolioTop() {
    cancelScrollAnimationRef.current();

    if (
      window.scrollY === 0 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }

    const startPosition = window.scrollY;
    const duration = Math.min(700, Math.max(320, startPosition / 4));
    const startTime = performance.now();
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    let animationFrame = 0;
    let isFinished = false;

    root.style.scrollBehavior = "auto";

    function cleanup() {
      if (isFinished) return;
      isFinished = true;
      cancelAnimationFrame(animationFrame);
      root.style.scrollBehavior = previousScrollBehavior;
      window.removeEventListener("wheel", cancel, { capture: true });
      window.removeEventListener("touchstart", cancel, { capture: true });
      window.removeEventListener("pointerdown", cancel, { capture: true });
      window.removeEventListener("keydown", cancel, { capture: true });
    }

    function cancel() {
      cleanup();
    }

    function updateScroll(currentTime: number) {
      const progress = Math.min(1, (currentTime - startTime) / duration);
      const easedProgress = easeOutQuint(progress);

      window.scrollTo({
        top: startPosition * (1 - easedProgress),
        behavior: "instant",
      });

      if (progress < 1) {
        animationFrame = requestAnimationFrame(updateScroll);
      } else {
        cleanup();
      }
    }

    window.addEventListener("wheel", cancel, { capture: true, passive: true });
    window.addEventListener("touchstart", cancel, {
      capture: true,
      passive: true,
    });
    window.addEventListener("pointerdown", cancel, {
      capture: true,
      passive: true,
    });
    window.addEventListener("keydown", cancel, { capture: true });
    animationFrame = requestAnimationFrame(updateScroll);
    cancelScrollAnimationRef.current = cleanup;
  }

  function handleHomeClick(event: MouseEvent<HTMLAnchorElement>) {
    if (isHome) {
      event.preventDefault();
      scrollToPortfolioTop();
      return;
    }

    if (readSessionValue(portfolioScrollPositionKey) !== null) {
      event.preventDefault();
      router.back();
    }
  }

  function handleNavigationPointerOver(event: PointerEvent<HTMLElement>) {
    if (
      event.pointerType === "touch" ||
      !window.matchMedia("(hover: hover)").matches
    ) {
      return;
    }

    const navigationItem = findNavigationItem(event.target);
    if (!navigationItem || !event.currentTarget.contains(navigationItem)) {
      return;
    }

    hoveredNavigationItemRef.current = navigationItem;
    refreshNavigationIndicator();
  }

  function handleNavigationPointerLeave() {
    hoveredNavigationItemRef.current = null;
    refreshNavigationIndicator();
  }

  function handleNavigationFocus(event: FocusEvent<HTMLElement>) {
    const navigationItem = findNavigationItem(event.target);
    if (!navigationItem) return;

    requestAnimationFrame(() => {
      if (!navigationItem.matches(":focus-visible")) {
        focusedNavigationItemRef.current = null;
        refreshNavigationIndicator();
        return;
      }
      focusedNavigationItemRef.current = navigationItem;
      showNavigationIndicator(navigationItem);
    });
  }

  function handleNavigationBlur(event: FocusEvent<HTMLElement>) {
    const nextNavigationItem = findNavigationItem(event.relatedTarget);
    if (nextNavigationItem && event.currentTarget.contains(nextNavigationItem)) {
      return;
    }

    focusedNavigationItemRef.current = null;
    refreshNavigationIndicator();
  }

  return (
    <nav
      ref={navigationRef}
      className={`nav${isHome ? " nav--home" : " nav--case"}`}
      aria-label="Primary navigation"
      data-view={controls.view}
      data-indicator-visible="false"
      onPointerOver={handleNavigationPointerOver}
      onPointerLeave={handleNavigationPointerLeave}
      onFocusCapture={handleNavigationFocus}
      onBlurCapture={handleNavigationBlur}
      style={{
        "--nav-transition-duration": `${navigationTransitionDurationMs}ms`,
      } as CSSProperties}
    >
      <span className="nav__indicator" aria-hidden="true" />

      <Link
        className="nav__link nav__home"
        href="/"
        onClick={handleHomeClick}
        data-nav-item
        data-nav-home="true"
        data-scroll-target-active={!isHome || !isAtPortfolioTop}
        tabIndex={0}
      >
        <span className="nav__back-icon" aria-hidden="true">
          ←&nbsp;
        </span>
        <span>Seva Kudryavtsev</span>
      </Link>

      <div
        className="nav__view-slot"
        aria-hidden={!isHome}
        inert={!isHome}
      >
        <div className="nav__view-slot-inner">
          <button
            className="nav__link nav__view-toggle"
            type="button"
            onClick={controls.toggleView}
            disabled={!controls.toggleView}
            aria-pressed={controls.view === "snakeview"}
            aria-busy={controls.busy}
            data-nav-item
            tabIndex={0}
          >
            {controls.view === "snakeview" ? "Snakeview" : "Birdview"}
          </button>
        </div>
      </div>

      <a
        className="nav__link"
        href="https://www.linkedin.com/in/5p17f1re/"
        target="_blank"
        rel="noopener noreferrer"
        data-nav-item
        tabIndex={0}
      >
        LinkedIn
      </a>
      <EmailButton />
    </nav>
  );
}

export function NavigationShell({ children }: { children: ReactNode }) {
  const [controls, setControls] = useState<HomeNavigationControls>({
    view: "birdview",
    busy: false,
  });

  const register = useCallback<RegisterHomeNavigation>((nextControls) => {
    setControls((currentControls) =>
      nextControls ?? {
        ...currentControls,
        busy: false,
        toggleView: undefined,
      },
    );
  }, []);

  return (
    <NavigationRegistrationContext.Provider value={register}>
      <Navigation controls={controls} />
      {children}
    </NavigationRegistrationContext.Provider>
  );
}
