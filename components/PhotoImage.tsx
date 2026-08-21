import photoMediaManifest from "@/generated/photo-media-manifest.json";

type PhotoMediaAsset = {
  width: number;
  height: number;
  fallback: string;
  avifSrcSet: string;
  webpSrcSet: string;
  placeholder: string;
};

const media = photoMediaManifest as Record<string, PhotoMediaAsset>;

function getPhotoMediaAsset(assetKey: string) {
  const asset = media[assetKey];
  if (!asset) throw new Error(`Missing photo media asset: ${assetKey}`);
  return asset;
}

export function PhotoImage({ assetKey, alt }: { assetKey: string; alt: string }) {
  const asset = getPhotoMediaAsset(assetKey);

  return (
    <picture
      className="photo-image"
      style={{
        aspectRatio: `${asset.width} / ${asset.height}`,
        backgroundImage: `url("${asset.placeholder}")`,
      }}
    >
      <source type="image/avif" srcSet={asset.avifSrcSet} sizes="(max-width: 760px) 100vw, 50vw" />
      <source type="image/webp" srcSet={asset.webpSrcSet} sizes="(max-width: 760px) 100vw, 50vw" />
      <img
        className="photo-image__img"
        src={asset.fallback}
        width={asset.width}
        height={asset.height}
        alt={alt}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
}
