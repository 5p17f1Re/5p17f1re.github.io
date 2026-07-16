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

  async function reveal() {
    const image = imageRef.current;

    if (!image) return;

    try {
      await image.decode();
    } catch {
      if (!image.complete || image.naturalWidth === 0) return;
    }

    if (imageRef.current !== image) return;

    decodedAssets.add(assetKey);
    setLoaded(true);
  }

  useLayoutEffect(() => {
    const image = imageRef.current;

    if (image?.complete && image.naturalWidth > 0) void reveal();
  }, [assetKey]);

  return (
    <picture
      className={`optimized-image ${className}`.trim()}
      style={{
        aspectRatio: `${asset.width} / ${asset.height}`,
        backgroundImage: loaded ? "none" : `url("${asset.placeholder}")`,
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
        onLoad={() => void reveal()}
        onError={() => setLoaded(false)}
      />
    </picture>
  );
}
