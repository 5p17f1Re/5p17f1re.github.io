"use client";

import { useState } from "react";
import { OptimizedImage } from "./OptimizedImage";

const mediaRoot = "pye-tryon-app/playground";

export function PyePlaygroundTeaserArt() {
  const [front, setFront] = useState<"loader" | "bag">("loader");

  return (
    <button
      className="pye-playground-teaser-art"
      type="button"
      aria-label="Показать следующую карточку PYE"
      onClick={() => setFront((current) => current === "loader" ? "bag" : "loader")}
    >
      <span className="pye-playground-teaser-art__card" data-position={front === "loader" ? "front" : "back"}>
        <OptimizedImage assetKey={`${mediaRoot}/10-card-front-image`} alt="" sizes="283px" lossless />
      </span>
      <span className="pye-playground-teaser-art__card" data-position={front === "bag" ? "front" : "back"}>
        <OptimizedImage assetKey={`${mediaRoot}/10-card-back-image`} alt="" sizes="283px" lossless />
      </span>
    </button>
  );
}
