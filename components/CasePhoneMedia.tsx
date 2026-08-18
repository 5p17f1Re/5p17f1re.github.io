"use client";

import { useEffect, useRef, useState } from "react";
import { OptimizedImage } from "./OptimizedImage";
import { Squircle } from "./Squircle";

type Asset = { type: "image"; assetKey: string; alt: string } | { type: "video"; src: string; title: string };

function Phone({ asset }: { asset: Asset }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const videoSource = asset.type === "video" ? asset.src : undefined;

  useEffect(() => {
    if (!videoSource) return;

    const video = videoRef.current;
    if (!video) return;

    if (typeof IntersectionObserver === "undefined") {
      video.src = videoSource;
      video.preload = "metadata";
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        void video.play().catch(() => {});
      }
      return () => video.pause();
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVideoVisible(entry.isIntersecting);

        if (entry.isIntersecting) {
          setShouldLoadVideo(true);
        } else {
          video.pause();
        }
      },
      { threshold: 0.01 },
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [videoSource]);

  useEffect(() => {
    if (
      !videoSource ||
      !shouldLoadVideo ||
      !isVideoVisible ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    void video.play().catch(() => {});

    return () => video.pause();
  }, [videoSource, isVideoVisible, shouldLoadVideo]);

  return (
    <div className="case-phone-media__surface">
      <Squircle cornerRadius={28} className="case-phone-media__screen">
        {asset.type === "image" ? (
          <OptimizedImage
            assetKey={asset.assetKey}
            alt={asset.alt}
            className="case-phone-media__image"
            sizes="(max-width: 800px) min(375px, calc(100vw - 64px)), 375px"
          />
        ) : (
          <video
            ref={videoRef}
            className="case-phone-media__video"
            src={shouldLoadVideo ? asset.src : undefined}
            aria-label={asset.title}
            muted
            loop
            playsInline
            preload={shouldLoadVideo ? "metadata" : "none"}
          />
        )}
      </Squircle>
    </div>
  );
}

export function CasePhoneMedia({ assets }: { assets: [Asset, Asset] }) {
  return (
    <div className="case-media case-media--wide case-phone-media">
      {assets.map((asset, index) => (
        <Phone key={index} asset={asset} />
      ))}
    </div>
  );
}
