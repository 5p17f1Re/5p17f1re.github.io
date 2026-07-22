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
import { LocaleTextTransition } from "./LocaleTextTransition";
import { getLanguageSwitchState } from "@/data/language-switch";
import { getLocalizedPath, type SiteLocale } from "@/data/locales";
import { getUiText } from "@/data/ui-text";
import { trackContactIntent, trackOutboundLink } from "./analytics";

export type PortfolioViewMode = "birdview" | "snakeview";

type HomeNavigationControls = {
  view: PortfolioViewMode;
  busy: boolean;
  toggleView?: () => void;
  locale?: SiteLocale;
  switchLocale?: (locale: SiteLocale) => void;
  localeTextTransitionId?: number;
};

type NavigationViewControls = {
  view: PortfolioViewMode;
  busy: boolean;
  toggleView: () => void;
  locale: SiteLocale;
  switchLocale: (locale: SiteLocale) => void;
  localeTextTransitionId: number;
};

type RegisterHomeNavigation = (
  controls: NavigationViewControls | null,
) => void;

const portfolioScrollPositionKey = "portfolio-scroll-position";
const navigationTransitionDurationMs = 200;
const caseLocaleTransitionDurationMs = 180;
const NavigationRegistrationContext =
  createContext<RegisterHomeNavigation | null>(null);

function writeSessionValue(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Navigation still works when storage is unavailable.
  }
}

export function rememberPortfolioScrollPosition() {
  writeSessionValue(portfolioScrollPositionKey, String(window.scrollY));
}

export function useNavigationViewControls({
  view,
  busy,
  toggleView,
  locale,
  switchLocale,
  localeTextTransitionId,
}: NavigationViewControls) {
  const register = useContext(NavigationRegistrationContext);
  const toggleViewRef = useRef(toggleView);
  const switchLocaleRef = useRef(switchLocale);

  if (!register) {
    throw new Error(
      "useNavigationViewControls must be used inside NavigationShell",
    );
  }

  useLayoutEffect(() => {
    toggleViewRef.current = toggleView;
  }, [toggleView]);

  useLayoutEffect(() => {
    switchLocaleRef.current = switchLocale;
  }, [switchLocale]);

  const handleToggleView = useCallback(() => {
    toggleViewRef.current();
  }, []);

  const handleSwitchLocale = useCallback((nextLocale: SiteLocale) => {
    switchLocaleRef.current(nextLocale);
  }, []);

  useLayoutEffect(() => {
    register({
      view,
      busy,
      toggleView: handleToggleView,
      locale,
      switchLocale: handleSwitchLocale,
      localeTextTransitionId,
    });
  }, [
    busy,
    handleSwitchLocale,
    handleToggleView,
    locale,
    localeTextTransitionId,
    register,
    view,
  ]);

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

function waitForImageDecode(image: HTMLImageElement) {
  if (image.complete) {
    return image.decode().catch(() => undefined);
  }

  return new Promise<void>((resolve) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => resolve(), { once: true });
  });
}

function Navigation({ controls }: { controls: HomeNavigationControls }) {
  const pathname = usePathname();
  const router = useRouter();
  const isRussianPath = pathname === "/ru" || pathname.startsWith("/ru/");
  const isHome = pathname === "/" || pathname === "/ru/";
  const homeHref = isRussianPath ? "/ru/" : "/";
  const navigationRef = useRef<HTMLElement>(null);
  const homeLabelRef = useRef<HTMLSpanElement>(null);
  const caseLocaleOverlayRef = useRef<HTMLElement | null>(null);
  const caseLocaleOverlayTargetLocaleRef = useRef<SiteLocale | null>(null);
  const caseLocaleOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const caseLocaleOverlayFallbackTimerRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);
  const cancelScrollAnimationRef = useRef<() => void>(() => undefined);
  const hoveredNavigationItemRef = useRef<HTMLElement | null>(null);
  const focusedNavigationItemRef = useRef<HTMLElement | null>(null);
  const [isAtPortfolioTop, setIsAtPortfolioTop] = useState(true);
  const [isLanguageNoticeVisible, setIsLanguageNoticeVisible] =
    useState(false);
  const [homeLinkWidth, setHomeLinkWidth] = useState<number>();
  const pathnameLanguageSwitch = getLanguageSwitchState(pathname);
  const currentLocale =
    isHome && controls.locale
      ? controls.locale
      : pathnameLanguageSwitch.currentLocale;
  const targetLocale: SiteLocale = currentLocale === "en" ? "ru" : "en";
  const languageSwitch = isHome
    ? {
        currentLocale,
        targetLocale,
        targetPath: getLocalizedPath({ locale: targetLocale }),
        unavailableMessage: "",
      }
    : pathnameLanguageSwitch;
  const text = getUiText(languageSwitch.currentLocale);
  const languageNoticeId = "language-switch-notice";

  useLayoutEffect(() => {
    const homeLabel = homeLabelRef.current;
    if (!homeLabel) return;

    const backIconWidth = isHome ? 0 : 14;
    setHomeLinkWidth(
      Math.ceil(homeLabel.getBoundingClientRect().width) + 24 + backIconWidth,
    );
  }, [isHome, languageSwitch.currentLocale]);

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
      if (caseLocaleOverlayTimerRef.current) {
        clearTimeout(caseLocaleOverlayTimerRef.current);
      }
      if (caseLocaleOverlayFallbackTimerRef.current) {
        clearTimeout(caseLocaleOverlayFallbackTimerRef.current);
      }
      caseLocaleOverlayRef.current?.remove();
      caseLocaleOverlayTargetLocaleRef.current = null;
      document.documentElement.classList.remove("case-locale-transition-active");
    },
    [],
  );

  useEffect(() => {
    const overlay = caseLocaleOverlayRef.current;
    if (!overlay) return;
    const overlayElement = overlay;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      overlayElement.remove();
      caseLocaleOverlayRef.current = null;
      caseLocaleOverlayTargetLocaleRef.current = null;
      document.documentElement.classList.remove("case-locale-transition-active");
      return;
    }

    let cancelled = false;
    let fadeStarted = false;
    let animationFrame = 0;

    function removeOverlay() {
      const targetLocale = caseLocaleOverlayTargetLocaleRef.current;
      const newCasePage = targetLocale
        ? document.querySelector<HTMLElement>(
            `.case-page-shell[lang="${targetLocale}"]:not(.case-locale-transition-overlay)`,
          )
        : null;

      newCasePage?.classList.remove("case-page-shell--entering");
      overlayElement.remove();
      if (caseLocaleOverlayRef.current === overlayElement) {
        caseLocaleOverlayRef.current = null;
      }
      caseLocaleOverlayTargetLocaleRef.current = null;
      caseLocaleOverlayTimerRef.current = null;
      document.documentElement.classList.remove("case-locale-transition-active");
    }

    function fadeOverlay() {
      if (cancelled || fadeStarted) return;
      fadeStarted = true;
      if (caseLocaleOverlayFallbackTimerRef.current) {
        clearTimeout(caseLocaleOverlayFallbackTimerRef.current);
        caseLocaleOverlayFallbackTimerRef.current = null;
      }
      animationFrame = requestAnimationFrame(() => {
        overlayElement.style.opacity = "0";
      });
      caseLocaleOverlayTimerRef.current = setTimeout(
        removeOverlay,
        caseLocaleTransitionDurationMs,
      );
    }

    async function waitForTargetCasePage() {
      const targetLocale = caseLocaleOverlayTargetLocaleRef.current;
      const newCasePage = targetLocale
        ? document.querySelector<HTMLElement>(
            `.case-page-shell[lang="${targetLocale}"]:not(.case-locale-transition-overlay)`,
          )
        : null;

      if (!newCasePage) {
        animationFrame = requestAnimationFrame(() => {
          void waitForTargetCasePage();
        });
        return;
      }

      const visibleImages = Array.from(
        newCasePage.querySelectorAll("img"),
      ).filter((image) => {
        const bounds = image.getBoundingClientRect();
        return bounds.top < window.innerHeight && bounds.bottom > 0;
      });

      await Promise.all(visibleImages.map(waitForImageDecode));
      fadeOverlay();
    }

    animationFrame = requestAnimationFrame(() => {
      void waitForTargetCasePage();
    });
    caseLocaleOverlayFallbackTimerRef.current = setTimeout(
      fadeOverlay,
      2500,
    );

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      if (caseLocaleOverlayFallbackTimerRef.current) {
        clearTimeout(caseLocaleOverlayFallbackTimerRef.current);
        caseLocaleOverlayFallbackTimerRef.current = null;
      }
    };
  }, [pathname]);

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

  function showLanguageNotice() {
    if (!languageSwitch.targetPath) setIsLanguageNoticeVisible(true);
  }

  function hideLanguageNotice() {
    setIsLanguageNoticeVisible(false);
  }

  function createCaseLocaleOverlay(targetLocale: SiteLocale) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const casePage = document.querySelector<HTMLElement>(".case-page-shell");
    if (!casePage) return;

    caseLocaleOverlayRef.current?.remove();
    if (caseLocaleOverlayTimerRef.current) {
      clearTimeout(caseLocaleOverlayTimerRef.current);
    }
    if (caseLocaleOverlayFallbackTimerRef.current) {
      clearTimeout(caseLocaleOverlayFallbackTimerRef.current);
    }

    const bounds = casePage.getBoundingClientRect();
    const overlay = casePage.cloneNode(true) as HTMLElement;

    overlay.removeAttribute("id");
    overlay.setAttribute("aria-hidden", "true");
    overlay.classList.remove("case-page-shell--entering");
    overlay.classList.add("case-locale-transition-overlay");
    overlay.style.top = `${bounds.top}px`;
    overlay.style.left = `${bounds.left}px`;
    overlay.style.width = `${bounds.width}px`;
    document.documentElement.classList.add("case-locale-transition-active");
    document.body.append(overlay);
    caseLocaleOverlayRef.current = overlay;
    caseLocaleOverlayTargetLocaleRef.current = targetLocale;
  }

  function handleLanguageSwitch(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    if (isHome && controls.switchLocale) {
      event.preventDefault();
      controls.switchLocale(languageSwitch.targetLocale);
      return;
    }

    event.preventDefault();
    createCaseLocaleOverlay(languageSwitch.targetLocale);
    router.push(languageSwitch.targetPath!, { scroll: false });
  }

  return (
    <nav
      ref={navigationRef}
      className={`nav${isHome ? " nav--home" : " nav--case"}`}
      aria-label={text.primaryNavigation}
      data-view={controls.view}
      data-indicator-visible="false"
      data-nav-width-ready={homeLinkWidth !== undefined}
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
        href={homeHref}
        onClick={handleHomeClick}
        data-nav-item
        data-nav-home="true"
        data-scroll-target-active={!isHome || !isAtPortfolioTop}
        tabIndex={0}
        style={
          homeLinkWidth === undefined ? undefined : { width: homeLinkWidth }
        }
      >
        <span className="nav__back-icon" aria-hidden="true">
          ←&nbsp;
        </span>
        <span ref={homeLabelRef}>
          <LocaleTextTransition
            transitionId={controls.localeTextTransitionId ?? 0}
          >
            {languageSwitch.currentLocale === "ru"
              ? "Сева Кудрявцев"
              : "Seva Kudryavtsev"}
          </LocaleTextTransition>
        </span>
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
            <LocaleTextTransition
              transitionId={controls.localeTextTransitionId ?? 0}
            >
              {controls.view === "snakeview" ? text.snakeview : text.birdview}
            </LocaleTextTransition>
          </button>
        </div>
      </div>

      {languageSwitch.targetPath ? (
        <Link
          className="nav__link nav__language-switch"
          href={languageSwitch.targetPath}
          lang={languageSwitch.targetLocale}
          onClick={handleLanguageSwitch}
          data-nav-item
          tabIndex={0}
        >
          <LocaleTextTransition
            transitionId={controls.localeTextTransitionId ?? 0}
          >
            {languageSwitch.targetLocale.toUpperCase()}
          </LocaleTextTransition>
        </Link>
      ) : (
        <button
          className="nav__link nav__language-switch nav__language-switch--unavailable"
          type="button"
          aria-disabled="true"
          aria-describedby={languageNoticeId}
          data-language-notice-visible={isLanguageNoticeVisible}
          data-nav-item
          onClick={showLanguageNotice}
          onFocus={showLanguageNotice}
          onBlur={hideLanguageNotice}
          onPointerEnter={showLanguageNotice}
          onPointerLeave={hideLanguageNotice}
          title={languageSwitch.unavailableMessage}
        >
          {languageSwitch.targetLocale.toUpperCase()}
          <span
            id={languageNoticeId}
            className="nav__language-notice"
            role="status"
          >
            {languageSwitch.unavailableMessage}
          </span>
        </button>
      )}

      <a
        className="nav__link"
        href="https://www.linkedin.com/in/5p17f1re/"
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          trackOutboundLink("linkedin", "navigation");
          trackContactIntent("linkedin", "navigation");
        }}
        data-nav-item
        tabIndex={0}
      >
        LinkedIn
      </a>
      <EmailButton
        locale={languageSwitch.currentLocale}
        localeTextTransitionId={controls.localeTextTransitionId ?? 0}
      />
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
