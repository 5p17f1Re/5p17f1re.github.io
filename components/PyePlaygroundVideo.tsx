"use client";

import { useEffect, useRef, useState } from "react";
import mediaManifest from "@/generated/media-manifest.json";
import { Squircle } from "./Squircle";

const src = "/media/videos/pye-tryon-app/playground/09-home-drawer.mp4";

export function PyePlaygroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const userPausedRef = useRef(false);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(motion.matches);
    updateMotion();
    motion.addEventListener("change", updateMotion);

    const observer = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(
          ([entry]) => setVisible(entry.isIntersecting),
          { threshold: 0.01 },
        );
    if (observer) observer.observe(video);
    const fallbackFrame = observer ? null : window.requestAnimationFrame(() => setVisible(true));

    return () => {
      observer?.disconnect();
      if (fallbackFrame !== null) window.cancelAnimationFrame(fallbackFrame);
      motion.removeEventListener("change", updateMotion);
      video.pause();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (visible && !reducedMotion && !userPausedRef.current) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [visible, reducedMotion]);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      userPausedRef.current = false;
      void video.play().catch(() => {});
    } else {
      userPausedRef.current = true;
      video.pause();
    }
  }

  return (
    <figure className="pye-playground__video-stage">
      <Squircle cornerRadius={28} className="pye-playground__video-screen">
        <button
          className="pye-playground__video-toggle"
          type="button"
          aria-label={playing ? "Приостановить видео работы шторки PYE" : "Воспроизвести видео работы шторки PYE"}
          onClick={togglePlayback}
        >
          <video
            ref={videoRef}
            className="pye-playground__video"
            src={visible ? src : undefined}
            poster={mediaManifest["pye-tryon-app/playground/09-home-drawer-poster"].fallback}
            aria-hidden="true"
            muted
            loop
            playsInline
            preload={visible ? "metadata" : "none"}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        </button>
      </Squircle>
    </figure>
  );
}
