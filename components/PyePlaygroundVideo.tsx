"use client";

import { useEffect, useRef, useState } from "react";
import mediaManifest from "@/generated/media-manifest.json";
import { Squircle } from "./Squircle";

const src = "/media/videos/pye-tryon-app/playground/09-home-drawer.mp4";

export function PyePlaygroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

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
    if (visible && !reducedMotion) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [visible, reducedMotion]);

  return (
    <figure className="pye-playground__video-stage" aria-label="Видео работы шторки PYE">
      <Squircle cornerRadius={28} className="pye-playground__video-screen">
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
        />
      </Squircle>
    </figure>
  );
}
