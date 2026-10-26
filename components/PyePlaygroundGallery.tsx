"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const artworkHeight = 720;
const artworkStep = 894;

export function PyePlaygroundGallery() {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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
    const scale = image.getBoundingClientRect().height / artworkHeight;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: direction * artworkStep * scale, behavior: reducedMotion ? "instant" : "smooth" });
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || !event.isPrimary || event.button !== 0) return;
    const track = event.currentTarget;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startScrollLeft: track.scrollLeft };
    track.setPointerCapture(event.pointerId);
    setIsDragging(true);
    event.preventDefault();
  }

  function drag(event: ReactPointerEvent<HTMLDivElement>) {
    const state = dragRef.current;
    if (state?.pointerId !== event.pointerId) return;
    event.currentTarget.scrollLeft = state.startScrollLeft + state.startX - event.clientX;
  }

  function stopDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <figure className="pye-playground__gallery" aria-label="Варианты компактного интерфейса примерки">
      <div className="pye-playground__gallery-track" ref={trackRef} tabIndex={0} data-dragging={isDragging}
        role="region" aria-label="Горизонтальная галерея интерфейса"
        onPointerDown={startDrag} onPointerMove={drag} onPointerUp={stopDrag}
        onPointerCancel={stopDrag} onLostPointerCapture={stopDrag}>
        <Image className="pye-playground__gallery-art" src="/illustrations/pye-gallery-strip.png"
          alt="Пять вариантов интерфейса примерки с измерениями свободного пространства для камеры"
          width={9228} height={1440} draggable={false} unoptimized />
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
