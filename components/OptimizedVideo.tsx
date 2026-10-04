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
  const [shouldLoadVideo, setShouldLoadVideo] = useState(eager);

  useEffect(() => {
    const video = videoRef.current;
    const layer = video?.closest(".view-layer");

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

    let isIntersecting = false;

    // Layer visibility can change while an eager video's load flag stays true.
    // Reconcile playback directly instead of relying on another state update.
    function syncPlayback() {
      if (!video) return;
      const isVisible = isIntersecting && !layer?.classList.contains("view-layer--hidden");
      if (!isVisible) {
        video.pause();
        return;
      }
      if (!shouldLoadVideo) {
        setShouldLoadVideo(true);
        return;
      }
      void video.play().then(revealAfterRenderedFrame).catch(() => {});
    }

    const layerObserver = new MutationObserver(syncPlayback);
    if (layer) layerObserver.observe(layer, { attributeFilter: ["class"] });

    const observer = new IntersectionObserver(
      ([entry]) => {
        isIntersecting = entry.isIntersecting;
        syncPlayback();
      },
      { rootMargin: "200px 0px", threshold: 0.01 },
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
      layerObserver.disconnect();
      video.pause();

      const cancelVideoFrameCallback = (
        video as unknown as {
          cancelVideoFrameCallback?: HTMLVideoElement["cancelVideoFrameCallback"];
        }
      ).cancelVideoFrameCallback;

      if (frameRequestRef.current !== null && cancelVideoFrameCallback) {
        cancelVideoFrameCallback.call(video, frameRequestRef.current);
        frameRequestRef.current = null;
      }
    };
  }, [shouldLoadVideo, src]);

  return (
    <div
      className={`optimized-video ${className}`.trim()}
      data-rendered-frame={hasRenderedVideoFrame ? "true" : undefined}
      style={{ aspectRatio: `${poster.width} / ${poster.height}` }}
    >
      <OptimizedImage
        assetKey={posterKey}
        alt=""
        className="optimized-video__poster"
        sizes={sizes}
        eager={eager}
      />
      <video
        ref={videoRef}
        className="optimized-video__media"
        data-rendered-frame={hasRenderedVideoFrame ? "true" : undefined}
        src={shouldLoadVideo ? src : undefined}
        aria-label={title}
        muted
        loop
        playsInline
        preload={shouldLoadVideo ? "metadata" : "none"}
        onError={() => setHasRenderedVideoFrame(false)}
      />
    </div>
  );
}
