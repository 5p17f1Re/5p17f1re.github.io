"use client";

import { useLayoutEffect, useRef, useState } from "react";
import mediaManifest from "@/generated/media-manifest.json";

export type MediaAsset = {
  width: number;
  height: number;
  fallback: string;
  avifSrcSet: string;
  webpSrcSet: string;
  placeholder: string;
};

const media = mediaManifest as Record<string, MediaAsset>;
const decodedAssets = new Set<string>();

export function getMediaAsset(assetKey: string) {
  const asset = media[assetKey];

  if (!asset) {
    throw new Error(`Missing media asset: ${assetKey}`);
  }

  return asset;
}

export function OptimizedImage({
  assetKey,
  alt,
  className = "",
  sizes,
  eager = false,
}: {
  assetKey: string;
  alt: string;
  className?: string;
  sizes: string;
  eager?: boolean;
}) {
  const asset = getMediaAsset(assetKey);
  const imageRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(() => decodedAssets.has(assetKey));

  function reveal() {
    decodedAssets.add(assetKey);
    setLoaded(true);
  }

  useLayoutEffect(() => {
    if (imageRef.current?.complete) {
      decodedAssets.add(assetKey);
      setLoaded(true);
    }
  }, [assetKey]);

  return (
    <picture
      className={`optimized-image ${className}`.trim()}
      style={{
        aspectRatio: `${asset.width} / ${asset.height}`,
        backgroundImage: `url("${asset.placeholder}")`,
      }}
    >
      <source type="image/avif" srcSet={asset.avifSrcSet} sizes={sizes} />
      <source type="image/webp" srcSet={asset.webpSrcSet} sizes={sizes} />
      <img
        ref={imageRef}
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
