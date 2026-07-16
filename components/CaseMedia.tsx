import type { ReactNode } from "react";
import { OptimizedImage } from "./OptimizedImage";

export type CaseMediaWidth = "inline" | "wide" | "full";

type CaseMediaItem = {
  assetKey: string;
  alt: string;
  caption?: ReactNode;
};

function CaseFigure({
  item,
  sizes,
  eager = false,
}: {
  item: CaseMediaItem;
  sizes: string;
  eager?: boolean;
}) {
  return (
    <figure className="case-media__figure">
      <OptimizedImage
        assetKey={item.assetKey}
        alt={item.alt}
        className="case-media__image"
        sizes={sizes}
        eager={eager}
      />
      {item.caption ? (
        <figcaption className="case-media__caption">{item.caption}</figcaption>
      ) : null}
    </figure>
  );
}

export function CaseMedia({
  width,
  assetKey,
  alt,
  caption,
  eager = false,
  transitionId,
}: CaseMediaItem & {
  width: CaseMediaWidth;
  eager?: boolean;
  transitionId?: string;
}) {
  const sizes =
    width === "inline"
      ? "(max-width: 800px) calc(100vw - 32px), 684px"
      : width === "wide"
        ? "(max-width: 800px) 100vw, 1156px"
        : "100vw";

  return (
    <div
      className={`case-media case-media--${width}`}
      data-transition-project={transitionId}
    >
      <CaseFigure
        item={{ assetKey, alt, caption }}
        sizes={sizes}
        eager={eager}
      />
    </div>
  );
}

export function CaseMediaPair({
  width,
  items,
}: {
  width: CaseMediaWidth;
  items: [CaseMediaItem, CaseMediaItem];
}) {
  const sizes =
    width === "inline"
      ? "(max-width: 800px) calc(100vw - 32px), 338px"
      : width === "wide"
        ? "(max-width: 800px) 100vw, 574px"
        : "(max-width: 800px) 100vw, 50vw";

  return (
    <div className={`case-media case-media--${width} case-media--pair`}>
      {items.map((item) => (
        <CaseFigure key={item.assetKey} item={item} sizes={sizes} />
      ))}
    </div>
  );
}
