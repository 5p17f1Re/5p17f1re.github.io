"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const artworkWidth = 5428;
const artworkStep = 894;

export function PyePlaygroundGallery() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(true);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const update = () => {
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      setProgress(maxScroll ? track.scrollLeft / maxScroll : 0);
      setCanGoBack(track.scrollLeft > 1);
      setCanGoForward(track.scrollLeft < maxScroll - 1);
    };

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(track);
    track.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      resizeObserver.disconnect();
      track.removeEventListener("scroll", update);
    };
  }, []);

  function move(direction: -1 | 1) {
    const track = trackRef.current;
    const image = track?.querySelector("img");
    if (!track || !image) return;
    const scale = image.getBoundingClientRect().width / artworkWidth;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: direction * artworkStep * scale, behavior: reducedMotion ? "instant" : "smooth" });
  }

  return (
    <figure className="pye-playground__gallery" aria-label="Варианты компактного интерфейса примерки">
      <div className="pye-playground__gallery-track" ref={trackRef} tabIndex={0}
        role="region" aria-label="Горизонтальная галерея интерфейса">
        <Image className="pye-playground__gallery-art" src="/illustrations/pye-gallery-strip.png"
          alt="Пять вариантов интерфейса примерки с измерениями свободного пространства для камеры"
          width={10856} height={1440} unoptimized />
      </div>
      <div className="pye-playground__gallery-controls">
        <button type="button" onClick={() => move(-1)} disabled={!canGoBack}
          aria-label="Прокрутить галерею назад">
          <Image src="/illustrations/pye-gallery-chevron-left.svg" alt="" width={24} height={24} />
        </button>
        <div className="pye-playground__gallery-progress" aria-hidden="true">
          <span style={{ transform: `translateX(${progress * 84}px)` }} />
        </div>
        <button type="button" onClick={() => move(1)} disabled={!canGoForward}
          aria-label="Прокрутить галерею вперёд">
          <Image src="/illustrations/pye-gallery-chevron-right.svg" alt="" width={24} height={24} />
        </button>
      </div>
    </figure>
  );
}
