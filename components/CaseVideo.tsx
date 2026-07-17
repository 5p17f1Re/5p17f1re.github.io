"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { CaseMediaWidth } from "./CaseMedia";
import { getMediaAsset } from "./OptimizedImage";

export function CaseVideo({
  width,
  src,
  posterAssetKey,
  title,
  hasAudio = false,
  caption,
}: {
  width: CaseMediaWidth;
  src: string;
  posterAssetKey: string;
  title: string;
  hasAudio?: boolean;
  caption?: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const poster = getMediaAsset(posterAssetKey);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!video || hasAudio || prefersReducedMotion) return;

    void video.play().then(() => setIsPlaying(true)).catch(() => {});
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
    <div className={`case-media case-media--${width}`}>
      <figure className="case-media__figure">
        <div className="case-video">
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
            style={{ aspectRatio: `${poster.width} / ${poster.height}` }}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />
          {!hasAudio ? (
            <button
              className="case-video__toggle"
              type="button"
              aria-label={isPlaying ? "Поставить видео на паузу" : "Воспроизвести видео"}
              onClick={() => void toggleSilentVideo()}
            >
              <span className="case-video__control" aria-hidden="true">
                {isPlaying ? "Пауза" : "Смотреть"}
              </span>
            </button>
          ) : null}
        </div>
        {caption ? (
          <figcaption className="case-media__caption">{caption}</figcaption>
        ) : null}
      </figure>
    </div>
  );
}
