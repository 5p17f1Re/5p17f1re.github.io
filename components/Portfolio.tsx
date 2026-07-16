"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { projects, type Project } from "@/data/projects";
import mediaManifest from "@/generated/media-manifest.json";
import { Navigation } from "./Navigation";

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

type MediaAsset = {
  width: number;
  height: number;
  fallback: string;
  avifSrcSet: string;
  webpSrcSet: string;
  placeholder: string;
};

const media = mediaManifest as Record<string, MediaAsset>;
const decodedAssets = new Set<string>();
const aboutSevaFirstParagraph =
  "Product designer with 11 years of experience in complex B2B and B2C products. I work where product logic, interface clarity and visual quality all matter.";
const aboutSevaDetails = [
  "My focus is analytics, operational tools and 0→1 products. I’m useful when a product is messy: many roles, edge cases, data states, business rules and unclear structure.",
  "Now I design restaurant-facing products at Yandex Eats. Before that, I led product design at STARTER, managed a team of designers and stayed hands-on with key flows. Earlier, I designed and launched digital products for Samokat, PYE, Auto.ru, Praktikum and Avgvst.",
];

function getMediaAsset(assetKey: string) {
  const asset = media[assetKey];

  if (!asset) {
    throw new Error(`Missing media asset: ${assetKey}`);
  }

  return asset;
}

function OptimizedImage({
  assetKey,
  alt,
  className,
  sizes,
  eager = false,
}: {
  assetKey: string;
  alt: string;
  className: string;
  sizes: string;
  eager?: boolean;
}) {
  const asset = getMediaAsset(assetKey);
  const imageRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(() => decodedAssets.has(assetKey));

  function reveal() {
    decodedAssets.add(assetKey);
    setLoaded(true);
  }

  useLayoutEffect(() => {
    // A cached image can finish before React attaches onLoad during hydration.
    // In that case reveal it explicitly instead of leaving the LQIP visible.
    if (imageRef.current?.complete) {
      decodedAssets.add(assetKey);
      setLoaded(true);
    }
  }, [assetKey]);

  return (
    <picture
      className={`optimized-image ${className}`}
      style={{
        aspectRatio: `${asset.width} / ${asset.height}`,
        backgroundImage: `url("${asset.placeholder}")`,
      }}
    >
      <source type="image/avif" srcSet={asset.avifSrcSet} sizes={sizes} />
      <source type="image/webp" srcSet={asset.webpSrcSet} sizes={sizes} />
      <img
        ref={imageRef}
        className="optimized-image__img"
        data-loaded={loaded ? "true" : undefined}
        src={asset.fallback}
        width={asset.width}
        height={asset.height}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        decoding="async"
        onLoad={reveal}
        onError={reveal}
      />
    </picture>
  );
}

function ViewportVideo({
  src,
  posterKey,
  title,
}: {
  src: string;
  posterKey: string;
  title: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const poster = getMediaAsset(posterKey);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { rootMargin: "200px 0px", threshold: 0.01 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      className="project__img project__video"
      src={src}
      poster={poster.fallback}
      aria-label={title}
      muted
      loop
      playsInline
      preload="metadata"
    />
  );
}

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
    return (
      <>
        <ViewportVideo
          src={project.video}
          posterKey={project.poster}
          title={project.title}
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
  row,
  column,
  eager = false,
  view,
}: {
  project: Project;
  row?: number;
  column?: number;
  eager?: boolean;
  view: ViewMode;
}) {
  const content = (
    <>
      <div className="project__header">
        <span className="project__tag">{project.tag}</span>
        <span className="project__title">{project.title}</span>
      </div>
      <ProjectMedia project={project} eager={eager} view={view} />
      <p className="project__desc">{project.description}</p>
    </>
  );

  const props = {
    className: "project",
    "data-row": row,
    "data-column": column,
  };

  return project.slug ? (
    <Link
      {...props}
      className="project project--link"
      href={`/${project.slug}/`}
      aria-label={`Open case study: ${project.title}`}
    >
      {content}
    </Link>
  ) : (
    <article {...props}>{content}</article>
  );
}

function BirdView({
  viewReady,
  reduceMotion,
}: {
  viewReady: boolean;
  reduceMotion: boolean;
}) {
  return (
    <motion.section
      className="projects projects--birdview"
      aria-label="Birdview"
      initial={false}
      animate={viewReady || reduceMotion ? "visible" : "hidden"}
    >
      <motion.div
        className="project-motion-cell"
        variants={initialCardVariants}
        custom={0}
      >
        <article
          className="project about-seva"
          data-row="0"
          data-column="0"
        >
          <div className="project__header">
            <span className="project__tag">about</span>
            <span className="project__title">Seva Kudryavtsev</span>
          </div>
          <OptimizedImage
            className="project__img"
            assetKey="sevakudrytavtsev"
            alt="Seva Kudryavtsev"
            sizes="(max-width: 800px) 50vw, 33vw"
            eager
          />
          <p className="project__desc">{aboutSevaFirstParagraph}</p>
        </article>
      </motion.div>

      {projects.map((project, index) => {
        const gridIndex = index + 1;
        const row = Math.floor(gridIndex / 3);

        return (
          <motion.div
            key={project.title}
            className="project-motion-cell"
            variants={initialCardVariants}
            custom={row}
          >
            <ProjectCard
              project={project}
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
  viewReady,
  reduceMotion,
}: {
  viewReady: boolean;
  reduceMotion: boolean;
}) {
  return (
    <motion.section
      className="projects projects--snakeview"
      aria-label="Snakeview"
      initial={false}
      animate={viewReady || reduceMotion ? "visible" : "hidden"}
    >
      <motion.article
        className="project hero-about"
        variants={initialCardVariants}
        custom={0}
      >
        <OptimizedImage
          className="hero-about__img"
          assetKey="sevakudrytavtsev"
          alt="Seva Kudryavtsev"
          sizes="300px"
          eager
        />
        <div className="hero-about__content">
          <div className="hero-about__header">
            <span className="hero-about__title">Seva Kudryavtsev</span>
          </div>
          <p className="hero-about__desc">{aboutSevaFirstParagraph}</p>
          {aboutSevaDetails.map((paragraph) => (
            <p className="hero-about__desc gray" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </div>
      </motion.article>

      {projects.map((project, index) => (
        <motion.div
          key={project.title}
          className="project-motion-cell"
          variants={initialCardVariants}
          custom={index + 1}
        >
          <ProjectCard project={project} view="snakeview" />
        </motion.div>
      ))}
    </motion.section>
  );
}

export function Portfolio() {
  const [view, setView] = useState<ViewMode>("birdview");
  const [viewReady, setViewReady] = useState(false);
  const [nextView, setNextView] = useState<ViewMode | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>();
  const reduceMotion = useReducedMotion();
  const switchingRef = useRef(false);
  const transitionIdRef = useRef(0);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const birdviewLayerRef = useRef<HTMLDivElement>(null);
  const snakeviewLayerRef = useRef<HTMLDivElement>(null);
  const heightCacheRef = useRef<Partial<Record<ViewMode, number>>>({});

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
    return () => {
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
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
  const isDisplayedSnake = displayedView === "snakeview";
  const transitionDirection =
    nextView === "birdview"
      ? "snakeviewToBirdview"
      : "birdviewToSnakeview";

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
    <>
      <Navigation
        viewToggle={
          <button
            className="nav__link nav__view-toggle"
            type="button"
            onClick={toggleView}
            aria-pressed={isDisplayedSnake}
            aria-busy={nextView !== null}
          >
            {isDisplayedSnake ? "Snakeview" : "Birdview"}
          </button>
        }
      />

      <main className="page">
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
              viewReady={viewReady}
              reduceMotion={Boolean(reduceMotion)}
            />
          </motion.div>
        </div>
      </main>
    </>
  );
}
