"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { projects, type Project } from "@/data/projects";
import mediaManifest from "@/generated/media-manifest.json";
import { Navigation } from "./Navigation";

type ViewMode = "birdview" | "snakeview";

const easeOutExpo = [0.16, 1, 0.3, 1] as const;

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
  const asset = media[assetKey];
  const [loaded, setLoaded] = useState(() => decodedAssets.has(assetKey));

  function reveal() {
    decodedAssets.add(assetKey);
    setLoaded(true);
  }

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
  const poster = media[posterKey];

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
  if (project.video) {
    return (
      <>
        <ViewportVideo
          src={project.video}
          posterKey={project.poster!}
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
      assetKey={project.image!}
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

function BirdView() {
  const rowVariants = {
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

  return (
    <section className="projects projects--birdview" aria-label="Birdview">
      <motion.article
        className="project about-seva"
        data-row="0"
        data-column="0"
        variants={rowVariants}
        custom={0}
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
        <p className="project__desc">
          Product Designer who brings consumer-grade experience to complex
          products. 11 years in ecomm, foodtech and craft. Work with Yandex,
          Samokat, PYE, Auto.ru, Praktikum and Avgvst.
        </p>
      </motion.article>

      {projects.map((project, index) => {
        const gridIndex = index + 1;
        const row = Math.floor(gridIndex / 3);

        return (
          <motion.div
            key={project.title}
            className="project-motion-cell"
            variants={rowVariants}
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
    </section>
  );
}

function SnakeView() {
  return (
    <section
      className="projects projects--snakeview"
      aria-label="Snakeview"
    >
      <article className="project hero-about">
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
          <p className="hero-about__desc">
            Product Designer who brings consumer-grade experience to complex
            products.
          </p>
          <p className="hero-about__desc gray">
            11 years in ecomm, foodtech and craft. Work with Yandex, Samokat, PYE,
            Auto.ru, Praktikum and Avgvst.
          </p>
        </div>
      </article>

      {projects.map((project) => (
        <ProjectCard key={project.title} project={project} view="snakeview" />
      ))}
    </section>
  );
}

export function Portfolio() {
  const [view, setView] = useState<ViewMode>("birdview");
  const [viewReady, setViewReady] = useState(false);
  const [nextView, setNextView] = useState<ViewMode | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>();
  const reduceMotion = useReducedMotion();
  const switchingRef = useRef(false);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeLayerRef = useRef<HTMLDivElement>(null);
  const incomingLayerRef = useRef<HTMLDivElement>(null);
  const heightCacheRef = useRef<Partial<Record<ViewMode, number>>>({});

  useLayoutEffect(() => {
    const storedView =
      document.documentElement.dataset.portfolioView ??
      window.localStorage.getItem("portfolio-view");
    setView(storedView === "snakeview" ? "snakeview" : "birdview");
    setViewReady(true);
  }, []);

  useEffect(() => {
    return () => {
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const projectsElement =
      activeLayerRef.current?.querySelector<HTMLElement>(".projects");

    if (projectsElement) {
      heightCacheRef.current[view] = projectsElement.offsetHeight;
    }
  }, [view]);

  useEffect(() => {
    if (!nextView || !incomingLayerRef.current) return;

    const incomingHeight =
      incomingLayerRef.current.querySelector<HTMLElement>(".projects")
        ?.offsetHeight ?? 0;
    const activeHeight =
      activeLayerRef.current?.querySelector<HTMLElement>(".projects")
        ?.offsetHeight ?? 0;

    setContainerHeight(Math.max(activeHeight, incomingHeight));
    heightCacheRef.current[nextView] = incomingHeight;
  }, [nextView]);

  function persistView(next: ViewMode) {
    window.localStorage.setItem("portfolio-view", next);
    document.documentElement.dataset.portfolioView = next;
  }

  function finishSwitch(next: ViewMode) {
    if (!switchingRef.current) return;

    switchingRef.current = false;
    setView(next);
    setNextView(null);
    setContainerHeight(undefined);
  }

  function toggleView() {
    if (switchingRef.current) return;

    const next: ViewMode = view === "birdview" ? "snakeview" : "birdview";
    persistView(next);

    if (reduceMotion) {
      setView(next);
      return;
    }

    switchingRef.current = true;

    const currentHeight =
      heightCacheRef.current[view] ??
      activeLayerRef.current?.querySelector<HTMLElement>(".projects")
        ?.offsetHeight;
    const targetHeight = heightCacheRef.current[next];

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

    setContainerHeight(
      activeLayerRef.current?.querySelector<HTMLElement>(".projects")
        ?.offsetHeight,
    );
    setNextView(next);
    completionTimerRef.current = setTimeout(() => {
      finishSwitch(next);
      completionTimerRef.current = null;
    }, 760);
  }

  const displayedView = nextView ?? view;
  const isDisplayedSnake = displayedView === "snakeview";
  const switchingToBird = nextView === "birdview";
  const switchingToSnake = nextView === "snakeview";

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
            key={`active-${view}-${nextView ?? "idle"}`}
            ref={activeLayerRef}
            className="view-layer view-layer--active"
            initial={false}
            animate={
              switchingToBird
                ? { scale: 0.68, opacity: 0 }
                : switchingToSnake
                  ? { scale: 1.16, opacity: 0 }
                  : { scale: 1, opacity: 1 }
            }
            transition={{ duration: 0.62, ease: easeOutExpo }}
            style={nextView ? undefined : { transform: "none", opacity: 1 }}
          >
            {view === "birdview" ? <BirdView /> : <SnakeView />}
          </motion.div>

          {nextView ? (
            <motion.div
              ref={incomingLayerRef}
              className="view-layer view-layer--incoming"
              initial={
                nextView === "birdview"
                  ? "hidden"
                  : { opacity: 0, y: 30, scale: 0.96 }
              }
              animate={
                nextView === "birdview"
                  ? "visible"
                  : { opacity: 1, y: 0, scale: 1 }
              }
              transition={{ duration: 0.62, ease: easeOutExpo }}
            >
              {nextView === "birdview" ? <BirdView /> : <SnakeView />}
            </motion.div>
          ) : null}
        </div>
      </main>
    </>
  );
}
