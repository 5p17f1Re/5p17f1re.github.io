"use client";

import { useEffect, useRef, useState } from "react";
import { getMediaAsset, OptimizedImage } from "./OptimizedImage";

export function OptimizedVideo({
  src,
  posterKey,
  title,
  className = "",
  sizes,
  eager = false,
}: {
  src: string;
  posterKey: string;
  title: string;
  className?: string;
  sizes: string;
  eager?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRequestRef = useRef<number | null>(null);
  const poster = getMediaAsset(posterKey);
  const [hasRenderedVideoFrame, setHasRenderedVideoFrame] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!video || prefersReducedMotion) return;

    function revealAfterRenderedFrame() {
      if (!video || frameRequestRef.current !== null) return;

      const requestVideoFrameCallback = (
        video as unknown as {
          requestVideoFrameCallback?: HTMLVideoElement["requestVideoFrameCallback"];
        }
      ).requestVideoFrameCallback;

      if (requestVideoFrameCallback) {
        frameRequestRef.current = requestVideoFrameCallback.call(video, () => {
          frameRequestRef.current = null;
          setHasRenderedVideoFrame(true);
        });
        return;
      }

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        setHasRenderedVideoFrame(true);
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play().then(revealAfterRenderedFrame).catch(() => {});
        } else {
          video.pause();
        }
      },
      { rootMargin: "200px 0px", threshold: 0.01 },
    );

    observer.observe(video);

    return () => {
      observer.disconnect();

      const cancelVideoFrameCallback = (
        video as unknown as {
          cancelVideoFrameCallback?: HTMLVideoElement["cancelVideoFrameCallback"];
        }
      ).cancelVideoFrameCallback;

      if (frameRequestRef.current !== null && cancelVideoFrameCallback) {
        cancelVideoFrameCallback.call(video, frameRequestRef.current);
      }
    };
  }, [src]);

  return (
    <div
      className={`optimized-video ${className}`.trim()}
      style={{ aspectRatio: `${poster.width} / ${poster.height}` }}
    >
      {!hasRenderedVideoFrame ? (
        <OptimizedImage
          assetKey={posterKey}
          alt=""
          className="optimized-video__poster"
          sizes={sizes}
          eager={eager}
        />
      ) : null}
      <video
        ref={videoRef}
        className="optimized-video__media"
        data-rendered-frame={hasRenderedVideoFrame ? "true" : undefined}
        src={src}
        poster={poster.fallback}
        aria-label={title}
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setHasRenderedVideoFrame(false)}
      />
    </div>
  );
}
