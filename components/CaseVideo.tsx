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
  const poster = getMediaAsset(posterAssetKey);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRenderedVideoFrame, setHasRenderedVideoFrame] = useState(false);
  const text = getUiText(locale);

  useEffect(() => {
    const video = videoRef.current;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!video || hasAudio || prefersReducedMotion) return;

    const revealAfterRenderedFrame = () => {
      if (frameRequestRef.current !== null) return;
      if (video.requestVideoFrameCallback) {
        frameRequestRef.current = video.requestVideoFrameCallback(() => {
          frameRequestRef.current = null;
          setHasRenderedVideoFrame(true);
        });
      } else if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        setHasRenderedVideoFrame(true);
      }
    };

    void video
      .play()
      .then(() => {
        setIsPlaying(true);
        revealAfterRenderedFrame();
      })
      .catch(() => {});

    return () => {
      if (
        frameRequestRef.current !== null &&
        video.cancelVideoFrameCallback
      ) {
        video.cancelVideoFrameCallback(frameRequestRef.current);
      }
    };
  }, [hasAudio]);

  async function toggleSilentVideo() {
    const video = videoRef.current;

    if (!video || hasAudio) return;

    if (video.paused) {
      await video.play().catch(() => {});
      setIsPlaying(!video.paused);
      return;
    }

    video.pause();
    setIsPlaying(false);
  }

  return (
    <SharedCaseCover
      className={`case-media case-media--${width}`}
      transitionId={transitionId}
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
              eager
            />
          ) : null}
          <video
            ref={videoRef}
            className="case-media__video"
            src={src}
            poster={poster.fallback}
            aria-label={title}
            controls={hasAudio}
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture={!hasAudio}
            muted={!hasAudio}
            loop={!hasAudio}
            playsInline
            preload="metadata"
            style={{ aspectRatio: aspectRatio ?? `${poster.width} / ${poster.height}` }}
            onError={() => setHasRenderedVideoFrame(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />
          {!hasAudio && showToggle ? (
            <button
              className="case-video__toggle"
              type="button"
              aria-label={isPlaying ? text.pauseVideo : text.playVideo}
              onClick={() => void toggleSilentVideo()}
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
