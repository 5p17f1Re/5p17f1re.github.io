"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { SiteLocale } from "@/data/locales";
import { getUiText } from "@/data/ui-text";
import type { CaseMediaWidth } from "./CaseMedia";
import { getMediaAsset, OptimizedImage } from "./OptimizedImage";
import { SharedCaseCover } from "./CaseCoverMotion";

export function CaseVideo({
  width,
  src,
  posterAssetKey,
  title,
  hasAudio = false,
  caption,
  locale = "ru",
  aspectRatio,
  showToggle = true,
  transitionId,
}: {
  width: CaseMediaWidth;
  src: string;
  posterAssetKey: string;
  title: string;
  hasAudio?: boolean;
  caption?: ReactNode;
  locale?: SiteLocale;
  aspectRatio?: string;
  showToggle?: boolean;
  transitionId?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRequestRef = useRef<number | null>(null);
  const playbackIntentRef = useRef<"play" | "pause" | null>(null);
  const isHero = Boolean(transitionId);
  const poster = getMediaAsset(posterAssetKey);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRenderedVideoFrame, setHasRenderedVideoFrame] = useState(false);
  const [isNearViewport, setIsNearViewport] = useState(isHero);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(hasAudio || isHero);
  const text = getUiText(locale);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasAudio) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsNearViewport(entry.isIntersecting);
        if (entry.isIntersecting) setShouldLoadVideo(true);
      },
      { rootMargin: "200px 0px", threshold: 0.01 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [hasAudio]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPlayback = () => {
      // Videos with sound remain entirely controlled by their native controls.
      if (hasAudio) return;
      const allowsPlayback =
        shouldLoadVideo &&
        isNearViewport &&
        document.visibilityState === "visible" &&
        playbackIntentRef.current !== "pause" &&
        (!reducedMotion.matches || playbackIntentRef.current === "play");

      if (allowsPlayback) {
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    };

    syncPlayback();
    document.addEventListener("visibilitychange", syncPlayback);
    reducedMotion.addEventListener("change", syncPlayback);

    return () => {
      document.removeEventListener("visibilitychange", syncPlayback);
      reducedMotion.removeEventListener("change", syncPlayback);
      video.pause();
      if (
        frameRequestRef.current !== null &&
        video.cancelVideoFrameCallback
      ) {
        video.cancelVideoFrameCallback(frameRequestRef.current);
        frameRequestRef.current = null;
      }
    };
  }, [hasAudio, isNearViewport, shouldLoadVideo, src]);

  function revealAfterRenderedFrame(video: HTMLVideoElement) {
    if (frameRequestRef.current !== null) return;
    if (video.requestVideoFrameCallback) {
      frameRequestRef.current = video.requestVideoFrameCallback(() => {
        frameRequestRef.current = null;
        if (videoRef.current !== video) return;
        setHasRenderedVideoFrame(true);
      });
    } else if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      setHasRenderedVideoFrame(true);
    }
  }

  function toggleSilentVideo() {
    const video = videoRef.current;

    if (!video || hasAudio) return;

    if (video.paused) {
      playbackIntentRef.current = "play";
      setShouldLoadVideo(true);
      if (!shouldLoadVideo) return;
      void video.play().catch(() => {});
      return;
    }

    playbackIntentRef.current = "pause";
    video.pause();
  }

  return (
    <SharedCaseCover
      className={`case-media case-media--${width}`}
      transitionId={transitionId}
      target
    >
      <figure className="case-media__figure">
        <div
          className="case-video"
          data-rendered-frame={hasRenderedVideoFrame ? "true" : undefined}
        >
          {!hasAudio ? (
            <OptimizedImage
              assetKey={posterAssetKey}
              alt=""
              className="case-video__poster"
              sizes={
                width === "inline"
                  ? "(max-width: 800px) calc(100vw - 32px), 684px"
                  : width === "wide"
                    ? "(max-width: 800px) 100vw, 1156px"
                    : "100vw"
              }
              eager={isHero}
            />
          ) : null}
          <video
            ref={videoRef}
            className="case-media__video"
            src={shouldLoadVideo ? src : undefined}
            poster={hasAudio ? poster.fallback : undefined}
            aria-label={title}
            controls={hasAudio}
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture={!hasAudio}
            muted={!hasAudio}
            loop={!hasAudio}
            playsInline
            preload={shouldLoadVideo ? "metadata" : "none"}
            style={{ aspectRatio: aspectRatio ?? `${poster.width} / ${poster.height}` }}
            onError={() => setHasRenderedVideoFrame(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPlaying={(event) => revealAfterRenderedFrame(event.currentTarget)}
          />
          {!hasAudio && showToggle ? (
            <button
              className="case-video__toggle"
              type="button"
              aria-label={isPlaying ? text.pauseVideo : text.playVideo}
              onClick={toggleSilentVideo}
            >
              <span className="case-video__control" aria-hidden="true">
                {isPlaying ? text.pauseVideoLabel : text.playVideoLabel}
              </span>
            </button>
          ) : null}
        </div>
        {caption ? (
          <figcaption className="case-media__caption">{caption}</figcaption>
        ) : null}
      </figure>
    </SharedCaseCover>
  );
}
