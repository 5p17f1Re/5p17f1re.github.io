"use client";

import { useEffect, useRef } from "react";
import { OptimizedImage } from "./OptimizedImage";
import { Squircle } from "./Squircle";

type Asset = { type: "image"; assetKey: string; alt: string } | { type: "video"; src: string; title: string };

function Phone({ asset }: { asset: Asset }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void video.play().catch(() => {});
  }, []);
  return <div className="case-phone-media__surface"><Squircle cornerRadius={28} className="case-phone-media__screen">{asset.type === "image" ? <OptimizedImage assetKey={asset.assetKey} alt={asset.alt} className="case-phone-media__image" sizes="(max-width: 800px) min(375px, calc(100vw - 64px)), 375px" /> : <video ref={videoRef} className="case-phone-media__video" src={asset.src} aria-label={asset.title} muted loop playsInline preload="metadata" />}</Squircle></div>;
}

export function CasePhoneMedia({ assets }: { assets: [Asset, Asset] }) { return <div className="case-media case-media--wide case-phone-media">{assets.map((asset, index) => <Phone key={index} asset={asset} />)}</div>; }
