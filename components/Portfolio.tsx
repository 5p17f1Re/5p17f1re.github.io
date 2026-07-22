"use client";

import Link from "next/link";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { getCasePath } from "@/data/cases";
import { getAbout } from "@/data/about";
import { getLocalizedPath } from "@/data/locales";
import { getProjects, type Project } from "@/data/projects";
import type { SiteLocale } from "@/data/locales";
import { getUiText, type UiText } from "@/data/ui-text";
import { OptimizedImage } from "./OptimizedImage";
import { OptimizedVideo } from "./OptimizedVideo";
import { LocaleTextTransition } from "./LocaleTextTransition";
import {
  rememberPortfolioScrollPosition,
  useNavigationViewControls,
} from "./Navigation";
import { trackEvent } from "./analytics";

type ViewMode = "birdview" | "snakeview";
type ViewLayerState = "current" | "outgoing" | "incoming" | "hidden";

const easeOutExpo = [0.16, 1, 0.3, 1] as const;
const viewTransitionEase = [0.22, 1, 0.36, 1] as const;
const viewTransitions = {
  snakeviewToBirdview: {
    snakeviewExitScale: 0.9,
    birdviewEnterScale: 1.1,
    birdviewRowGapFrom: "174px",
    birdviewRowGapTo: "120px",
  },
  birdviewToSnakeview: {
    birdviewExitScale: 1.1,
    snakeviewEnterScale: 0.9,
    snakeviewRowGapFrom: "44px",
    snakeviewRowGapTo: "80px",
  },
  duration: 0.5,
  totalDurationMs: 500,
} as const;

const initialCardVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (row: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.06 + row * 0.09,
      duration: 0.56,
      ease: easeOutExpo,
    },
  }),
};

function ProjectMedia({
  project,
  eager = false,
  view,
}: {
  project: Project;
  eager?: boolean;
  view: ViewMode;
}) {
  if (project.mediaType === "text") {
    return null;
  }

  if (project.mediaType === "video") {
    const sizes =
      view === "snakeview"
        ? "(max-width: 800px) 100vw, 800px"
        : "(max-width: 600px) 50vw, (max-width: 800px) 50vw, 33vw";

    return (
      <>
        <OptimizedVideo
          className="project__img project__video"
          src={project.video}
          posterKey={project.poster}
          title={project.title}
          sizes={sizes}
          eager={eager}
        />
        {project.extraImages ? (
          <div className="project__imgs project__imgs--extra">
            {project.extraImages.map((src) => (
              <OptimizedImage
                className="project__img project__img--half"
                key={src}
                assetKey={src}
                alt={project.title}
                sizes="(max-width: 800px) 50vw, 400px"
              />
            ))}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <OptimizedImage
      className="project__img"
      assetKey={project.image}
      alt={project.title}
      sizes={
        view === "snakeview"
          ? "(max-width: 800px) 100vw, 800px"
          : "(max-width: 600px) 50vw, (max-width: 800px) 50vw, 33vw"
      }
      eager={eager}
    />
  );
}

function ProjectCard({
  project,
  locale,
  localeTextTransitionId,
  text,
  row,
  column,
  eager = false,
  view,
}: {
  project: Project;
  locale: SiteLocale;
  localeTextTransitionId: number;
  text: UiText;
  row?: number;
  column?: number;
  eager?: boolean;
  view: ViewMode;
}) {
  const interactiveCardRef = useRef<HTMLAnchorElement>(null);
  const projectCaseLinkRef = useRef<HTMLSpanElement>(null);
  const cursorAnimationFrameRef = useRef<number | null>(null);
  const cursorPositionRef = useRef<{ x: number; y: number } | null>(null);
  const cursorTargetRef = useRef<{ x: number; y: number } | null>(null);
  const isCursorReturningRef = useRef(false);

  function setProjectCursorPosition(clientX: number, clientY: number) {
    const interactiveCard = interactiveCardRef.current;

    if (!interactiveCard) return;

    interactiveCard.style.setProperty(
      "--project-cursor-x",
      `${clientX}px`,
    );
    interactiveCard.style.setProperty(
      "--project-cursor-y",
      `${clientY}px`,
    );
  }

  function cancelProjectCursorAnimation() {
    if (cursorAnimationFrameRef.current !== null) {
      cancelAnimationFrame(cursorAnimationFrameRef.current);
      cursorAnimationFrameRef.current = null;
    }
  }

  function runProjectCursorAnimation() {
    const interactiveCard = interactiveCardRef.current;
    const cursorPosition = cursorPositionRef.current;
    const cursorTarget = cursorTargetRef.current;

    if (!interactiveCard || !cursorPosition || !cursorTarget) {
      cancelProjectCursorAnimation();
      return;
    }

    const easing = isCursorReturningRef.current ? 0.18 : 0.35;
    const deltaX = cursorTarget.x - cursorPosition.x;
    const deltaY = cursorTarget.y - cursorPosition.y;

    cursorPosition.x += deltaX * easing;
    cursorPosition.y += deltaY * easing;
    setProjectCursorPosition(cursorPosition.x, cursorPosition.y);

    if (
      isCursorReturningRef.current &&
      Math.hypot(deltaX, deltaY) < 0.75
    ) {
      setProjectCursorPosition(cursorTarget.x, cursorTarget.y);
      const projectCaseLink = projectCaseLinkRef.current;

      if (projectCaseLink) {
        projectCaseLink.style.setProperty("transition", "none");
        projectCaseLink.style.setProperty("opacity", "1");
      }
      delete interactiveCard.dataset.projectCursorState;
      interactiveCard.dataset.projectCursorHandoff = "true";
      requestAnimationFrame(() => {
        projectCaseLink?.style.removeProperty("transition");
        projectCaseLink?.style.removeProperty("opacity");
        delete interactiveCard.dataset.projectCursorHandoff;
      });
      cursorPositionRef.current = null;
      cursorTargetRef.current = null;
      cursorAnimationFrameRef.current = null;
      return;
    }

    cursorAnimationFrameRef.current = requestAnimationFrame(
      runProjectCursorAnimation,
    );
  }

  function startProjectCursorAnimation() {
    if (cursorAnimationFrameRef.current !== null) return;

    cursorAnimationFrameRef.current = requestAnimationFrame(
      runProjectCursorAnimation,
    );
  }

  function showProjectCursor(event: ReactPointerEvent<HTMLAnchorElement>) {
    if (
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const interactiveCard = interactiveCardRef.current;
    const projectCaseLink = projectCaseLinkRef.current;

    if (!interactiveCard || !projectCaseLink) return;

    const buttonBounds = projectCaseLink.getBoundingClientRect();
    cancelProjectCursorAnimation();

    const sourcePosition = {
      x: buttonBounds.left + buttonBounds.width / 2,
      y: buttonBounds.top + buttonBounds.height / 2,
    };

    cursorPositionRef.current = sourcePosition;
    cursorTargetRef.current = { x: event.clientX, y: event.clientY };
    isCursorReturningRef.current = false;
    setProjectCursorPosition(sourcePosition.x, sourcePosition.y);
    projectCaseLink.style.setProperty("opacity", "0");
    interactiveCard.dataset.projectCursorState = "active";
    startProjectCursorAnimation();
  }

  function moveProjectCursor(event: ReactPointerEvent<HTMLAnchorElement>) {
    if (event.pointerType !== "mouse") return;

    cursorTargetRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    isCursorReturningRef.current = false;
    startProjectCursorAnimation();
  }

  function hideProjectCursor() {
    const interactiveCard = interactiveCardRef.current;
    const projectCaseLink = projectCaseLinkRef.current;

    if (!interactiveCard || !projectCaseLink) return;

    const buttonBounds = projectCaseLink.getBoundingClientRect();

    if (!cursorPositionRef.current) return;

    cursorTargetRef.current = {
      x: buttonBounds.left + buttonBounds.width / 2,
      y: buttonBounds.top + buttonBounds.height / 2,
    };
    isCursorReturningRef.current = true;
    interactiveCard.dataset.projectCursorState = "returning";
    startProjectCursorAnimation();
  }

  useEffect(() => cancelProjectCursorAnimation, []);

  const content = (
    <>
      <div className="project__header">
        <span className="project__title">
          <LocaleTextTransition transitionId={localeTextTransitionId}>
            {project.title}
          </LocaleTextTransition>
        </span>
      </div>
      <ProjectMedia project={project} eager={eager} view={view} />
      <p className="project__desc">
        <LocaleTextTransition transitionId={localeTextTransitionId} block>
          {project.description}
        </LocaleTextTransition>
      </p>
      {project.slug ? (
        <span ref={projectCaseLinkRef} className="project__case-link">
          <LocaleTextTransition transitionId={localeTextTransitionId}>
            {text.readCase}
          </LocaleTextTransition>
        </span>
      ) : null}
    </>
  );

  const props = {
    className: "project",
    "data-row": row,
    "data-column": column,
    "data-transition-project": project.transitionId,
  };

  return project.slug ? (
    <Link
      {...props}
      ref={interactiveCardRef}
      className="project project--link"
      href={getCasePath({ locale, slug: project.slug })}
      aria-label={text.openCaseStudy(project.title)}
      onClick={() => {
        rememberPortfolioScrollPosition();
        trackEvent("case_opened", {
          case_slug: project.slug,
          locale,
          portfolio_view: view,
        });
      }}
      onPointerEnter={showProjectCursor}
      onPointerMove={moveProjectCursor}
      onPointerLeave={hideProjectCursor}
    >
      {content}
      <span
        className="project__cursor-read-case"
        aria-hidden="true"
      >
        <LocaleTextTransition transitionId={localeTextTransitionId}>
          {text.readCase}
        </LocaleTextTransition>
      </span>
    </Link>
  ) : (
    <article {...props}>{content}</article>
  );
}

function getProjectIdentity(project: Project) {
  if (project.transitionId) return project.transitionId;
  if (project.slug) return project.slug;
  if (project.mediaType === "image") return project.image;
  if (project.mediaType === "video") return project.video;
  return project.title;
}

function BirdView({
  projects,
  locale,
  localeTextTransitionId,
  isLocaleLayoutTransitionActive,
  showAbout,
  text,
  about,
  viewReady,
  reduceMotion,
}: {
  projects: Project[];
  locale: SiteLocale;
  localeTextTransitionId: number;
  isLocaleLayoutTransitionActive: boolean;
  showAbout: boolean;
  text: UiText;
  about: ReturnType<typeof getAbout>;
  viewReady: boolean;
  reduceMotion: boolean;
}) {
  return (
    <motion.section
      className="projects projects--birdview"
      aria-label={text.birdview}
      initial={false}
      animate={viewReady || reduceMotion ? "visible" : "hidden"}
    >
      {showAbout ? (
        <motion.div
          className="project-motion-cell"
          layout="position"
          transition={{
            layout: {
              duration: isLocaleLayoutTransitionActive ? 0.24 : 0,
              ease: viewTransitionEase,
            },
          }}
          variants={initialCardVariants}
          custom={0}
        >
          <article
            className="project about-seva"
            data-row="0"
            data-column="0"
          >
            <div className="project__header">
              <span className="project__title">
                <LocaleTextTransition transitionId={localeTextTransitionId}>
                {about.name}
                </LocaleTextTransition>
              </span>
            </div>
            <OptimizedImage
              className="project__img"
              assetKey="sevakudrytavtsev"
              alt={about.name}
              sizes="(max-width: 800px) 50vw, 33vw"
              eager
            />
            <p className="project__desc">
              <LocaleTextTransition
                transitionId={localeTextTransitionId}
                block
              >
                {about.paragraphs[0]}
              </LocaleTextTransition>
            </p>
          </article>
        </motion.div>
      ) : null}

      {projects.map((project, index) => {
        const gridIndex = index + (showAbout ? 1 : 0);
        const row = Math.floor(gridIndex / 3);

        return (
          <motion.div
            key={getProjectIdentity(project)}
            className="project-motion-cell"
            layout="position"
            transition={{
              layout: {
                duration: isLocaleLayoutTransitionActive ? 0.24 : 0,
                ease: viewTransitionEase,
              },
            }}
            variants={initialCardVariants}
            custom={row}
          >
            <ProjectCard
              project={project}
              locale={locale}
              localeTextTransitionId={localeTextTransitionId}
              text={text}
              row={row}
              column={gridIndex % 3}
              eager={index < 2}
              view="birdview"
            />
          </motion.div>
        );
      })}
    </motion.section>
  );
}

function SnakeView({
  projects,
  locale,
  localeTextTransitionId,
  isLocaleLayoutTransitionActive,
  showAbout,
  text,
  about,
  viewReady,
  reduceMotion,
}: {
  projects: Project[];
  locale: SiteLocale;
  localeTextTransitionId: number;
  isLocaleLayoutTransitionActive: boolean;
  showAbout: boolean;
  text: UiText;
  about: ReturnType<typeof getAbout>;
  viewReady: boolean;
  reduceMotion: boolean;
}) {
  return (
    <motion.section
      className="projects projects--snakeview"
      aria-label={text.snakeview}
      initial={false}
      animate={viewReady || reduceMotion ? "visible" : "hidden"}
    >
      {showAbout ? (
        <motion.article
          className="project hero-about"
          layout="position"
          transition={{
            layout: {
              duration: isLocaleLayoutTransitionActive ? 0.24 : 0,
              ease: viewTransitionEase,
            },
          }}
          variants={initialCardVariants}
          custom={0}
        >
          <OptimizedImage
            className="hero-about__img"
            assetKey="sevakudrytavtsev"
            alt={about.name}
            sizes="300px"
            eager
          />
          <div className="hero-about__content">
            <div className="hero-about__header">
              <span className="hero-about__title">
                <LocaleTextTransition transitionId={localeTextTransitionId}>
                {about.name}
                </LocaleTextTransition>
              </span>
            </div>
            <p className="hero-about__desc">
              <LocaleTextTransition
                transitionId={localeTextTransitionId}
                block
              >
                {about.paragraphs[0]}
              </LocaleTextTransition>
            </p>
            {about.paragraphs.slice(1).map((paragraph) => (
              <p className="hero-about__desc gray" key={paragraph}>
                <LocaleTextTransition
                  transitionId={localeTextTransitionId}
                  block
                >
                  {paragraph}
                </LocaleTextTransition>
              </p>
            ))}
          </div>
        </motion.article>
      ) : null}

      {projects.map((project, index) => (
        <motion.div
          key={getProjectIdentity(project)}
          className="project-motion-cell"
          layout="position"
          transition={{
            layout: {
              duration: isLocaleLayoutTransitionActive ? 0.24 : 0,
              ease: viewTransitionEase,
            },
          }}
          variants={initialCardVariants}
          custom={index + 1}
        >
          <ProjectCard
            project={project}
            locale={locale}
            localeTextTransitionId={localeTextTransitionId}
            text={text}
            view="snakeview"
          />
        </motion.div>
      ))}
    </motion.section>
  );
}

export function Portfolio({ locale = "en" }: { locale?: SiteLocale }) {
  const [activeLocale, setActiveLocale] = useState<SiteLocale>(locale);
  const projects = getProjects(activeLocale);
  const about = getAbout(activeLocale);
  const text = getUiText(activeLocale);
  const showAbout = true;
  const [view, setView] = useState<ViewMode>("birdview");
  const [viewReady, setViewReady] = useState(false);
  const [nextView, setNextView] = useState<ViewMode | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>();
  const [localeTextTransitionId, setLocaleTextTransitionId] = useState(0);
  const [isLocaleLayoutTransitionActive, setIsLocaleLayoutTransitionActive] =
    useState(false);
  const reduceMotion = useReducedMotion();
  const switchingRef = useRef(false);
  const transitionIdRef = useRef(0);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localeLayoutTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const birdviewLayerRef = useRef<HTMLDivElement>(null);
  const snakeviewLayerRef = useRef<HTMLDivElement>(null);
  const heightCacheRef = useRef<Partial<Record<ViewMode, number>>>({});

  const startLocaleLayoutTransition = useCallback(() => {
    if (localeLayoutTransitionTimerRef.current) {
      clearTimeout(localeLayoutTransitionTimerRef.current);
    }

    setIsLocaleLayoutTransitionActive(true);
    localeLayoutTransitionTimerRef.current = setTimeout(() => {
      localeLayoutTransitionTimerRef.current = null;
      setIsLocaleLayoutTransitionActive(false);
    }, 260);
  }, []);

  const switchLocale = useCallback(
    (nextLocale: SiteLocale) => {
      if (nextLocale === activeLocale) return;

      window.history.pushState(null, "", getLocalizedPath({ locale: nextLocale }));
      document.documentElement.lang = nextLocale;
      setActiveLocale(nextLocale);
      setLocaleTextTransitionId((currentId) => currentId + 1);
      startLocaleLayoutTransition();
    },
    [activeLocale, startLocaleLayoutTransition],
  );

  useEffect(() => {
    function syncLocaleWithHistory() {
      const nextLocale: SiteLocale = window.location.pathname.startsWith("/ru")
        ? "ru"
        : "en";
      setActiveLocale(nextLocale);
      document.documentElement.lang = nextLocale;
      setLocaleTextTransitionId((currentId) => currentId + 1);
      startLocaleLayoutTransition();
    }

    window.addEventListener("popstate", syncLocaleWithHistory);
    return () => window.removeEventListener("popstate", syncLocaleWithHistory);
  }, [startLocaleLayoutTransition]);

  function getLayer(mode: ViewMode) {
    return mode === "birdview"
      ? birdviewLayerRef.current
      : snakeviewLayerRef.current;
  }

  function getProjectsHeight(mode: ViewMode) {
    return getLayer(mode)?.querySelector<HTMLElement>(".projects")?.offsetHeight;
  }

  useLayoutEffect(() => {
    const storedView =
      document.documentElement.dataset.portfolioView ??
      window.localStorage.getItem("portfolio-view");
    /* eslint-disable react-hooks/set-state-in-effect -- The client-only preference is applied after hydration. */
    setView(storedView === "snakeview" ? "snakeview" : "birdview");
    setViewReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    let animationFrame = 0;

    function scheduleScrollPositionSave() {
      if (animationFrame) return;

      animationFrame = requestAnimationFrame(() => {
        animationFrame = 0;
        rememberPortfolioScrollPosition();
      });
    }

    window.addEventListener("scroll", scheduleScrollPositionSave, {
      passive: true,
    });
    window.addEventListener("pagehide", rememberPortfolioScrollPosition);

    return () => {
      window.removeEventListener("scroll", scheduleScrollPositionSave);
      window.removeEventListener("pagehide", rememberPortfolioScrollPosition);
      cancelAnimationFrame(animationFrame);
      rememberPortfolioScrollPosition();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }
      if (localeLayoutTransitionTimerRef.current) {
        clearTimeout(localeLayoutTransitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const mode = entry.target.closest(".view-layer--birdview")
          ? "birdview"
          : "snakeview";
        const height = (entry.target as HTMLElement).offsetHeight;

        heightCacheRef.current[mode] = height;

        if (nextView === mode) {
          setContainerHeight((currentHeight) =>
            currentHeight === height ? currentHeight : height,
          );
        }
      }
    });

    for (const mode of ["birdview", "snakeview"] as const) {
      const projectsElement =
        getLayer(mode)?.querySelector<HTMLElement>(".projects");

      if (projectsElement) {
        heightCacheRef.current[mode] = projectsElement.offsetHeight;
        observer.observe(projectsElement);
      }
    }

    return () => observer.disconnect();
  }, [nextView]);

  function persistView(next: ViewMode) {
    window.localStorage.setItem("portfolio-view", next);
    document.documentElement.dataset.portfolioView = next;
  }

  function finishSwitch(next: ViewMode, transitionId: number) {
    if (
      !switchingRef.current ||
      transitionId !== transitionIdRef.current
    ) {
      return;
    }

    switchingRef.current = false;
    completionTimerRef.current = null;
    setView(next);
    setNextView(null);
    setContainerHeight(undefined);
  }

  function toggleView() {
    const transitionSource = nextView ?? view;
    const next: ViewMode =
      transitionSource === "birdview" ? "snakeview" : "birdview";
    persistView(next);
    trackEvent("portfolio_view_changed", {
      portfolio_view: next,
    });

    if (reduceMotion) {
      setView(next);
      return;
    }

    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }

    const transitionId = transitionIdRef.current + 1;
    transitionIdRef.current = transitionId;
    switchingRef.current = true;

    const currentHeight =
      heightCacheRef.current[transitionSource] ??
      getProjectsHeight(transitionSource);
    const targetHeight =
      heightCacheRef.current[next] ??
      getProjectsHeight(next);

    if (currentHeight && targetHeight) {
      const viewportHeight = window.innerHeight;
      const currentMax = Math.max(1, currentHeight - viewportHeight);
      const targetMax = Math.max(0, targetHeight - viewportHeight);
      const progress = Math.min(1, window.scrollY / currentMax);

      window.scrollTo({
        top: progress * targetMax,
        behavior: "instant",
      });
    }

    setContainerHeight(targetHeight ?? currentHeight);
    setView(transitionSource);
    setNextView(next);
    completionTimerRef.current = setTimeout(() => {
      finishSwitch(next, transitionId);
    }, viewTransitions.totalDurationMs);
  }

  const displayedView = nextView ?? view;
  const transitionDirection =
    nextView === "birdview"
      ? "snakeviewToBirdview"
      : "birdviewToSnakeview";

  useNavigationViewControls({
    view: displayedView,
    busy: nextView !== null,
    toggleView,
    locale: activeLocale,
    switchLocale,
    localeTextTransitionId,
  });

  function getViewLayerState(mode: ViewMode): ViewLayerState {
    if (nextView === mode) return "incoming";
    if (view === mode) return nextView ? "outgoing" : "current";
    return "hidden";
  }

  function layerAnimation(mode: ViewMode) {
    const state = getViewLayerState(mode);

    if (state === "outgoing") {
      return {
        opacity: 0,
        scale:
          transitionDirection === "birdviewToSnakeview"
            ? viewTransitions.birdviewToSnakeview.birdviewExitScale
            : viewTransitions.snakeviewToBirdview.snakeviewExitScale,
        "--project-row-gap":
          mode === "birdview"
            ? viewTransitions.snakeviewToBirdview.birdviewRowGapTo
            : viewTransitions.birdviewToSnakeview.snakeviewRowGapTo,
      };
    }

    if (state === "current") {
      return {
        opacity: 1,
        scale: 1,
        "--project-row-gap":
          mode === "birdview"
            ? viewTransitions.snakeviewToBirdview.birdviewRowGapTo
            : viewTransitions.birdviewToSnakeview.snakeviewRowGapTo,
      };
    }

    if (state === "incoming") {
      return {
        opacity: 1,
        scale: 1,
        "--project-row-gap":
          mode === "birdview"
            ? viewTransitions.snakeviewToBirdview.birdviewRowGapTo
            : viewTransitions.birdviewToSnakeview.snakeviewRowGapTo,
      };
    }

    return {
      opacity: 0,
      scale:
        mode === "birdview"
          ? viewTransitions.snakeviewToBirdview.birdviewEnterScale
          : viewTransitions.birdviewToSnakeview.snakeviewEnterScale,
      "--project-row-gap":
        mode === "birdview"
          ? viewTransitions.snakeviewToBirdview.birdviewRowGapFrom
          : viewTransitions.birdviewToSnakeview.snakeviewRowGapFrom,
    };
  }

  const viewLayerTransition = {
    delay: 0,
    duration: viewTransitions.duration,
    ease: viewTransitionEase,
  };

  return (
    <main id="main-content" className="page">
      <h1 className="visually-hidden">{text.portfolioHeading}</h1>
      <div
        className={`view-stage${nextView ? " view-stage--switching" : ""}`}
        data-view-ready={viewReady ? "true" : "false"}
        style={containerHeight ? { height: containerHeight } : undefined}
      >
            <motion.div
              ref={birdviewLayerRef}
              className={`view-layer view-layer--birdview view-layer--${getViewLayerState("birdview")}`}
              initial={false}
              animate={layerAnimation("birdview") as Record<string, string | number>}
              transition={viewLayerTransition}
              aria-hidden={displayedView !== "birdview"}
            >
              <BirdView
                projects={projects}
                locale={activeLocale}
                localeTextTransitionId={localeTextTransitionId}
                isLocaleLayoutTransitionActive={isLocaleLayoutTransitionActive}
                showAbout={showAbout}
                text={text}
                about={about}
                viewReady={viewReady}
                reduceMotion={Boolean(reduceMotion)}
              />
            </motion.div>

            <motion.div
              ref={snakeviewLayerRef}
              className={`view-layer view-layer--snakeview view-layer--${getViewLayerState("snakeview")}`}
              initial={false}
              animate={layerAnimation("snakeview") as Record<string, string | number>}
              transition={viewLayerTransition}
              aria-hidden={displayedView !== "snakeview"}
            >
              <SnakeView
                projects={projects}
                locale={activeLocale}
                localeTextTransitionId={localeTextTransitionId}
                isLocaleLayoutTransitionActive={isLocaleLayoutTransitionActive}
                showAbout={showAbout}
                text={text}
                about={about}
                viewReady={viewReady}
                reduceMotion={Boolean(reduceMotion)}
              />
            </motion.div>
      </div>
    </main>
  );
}
