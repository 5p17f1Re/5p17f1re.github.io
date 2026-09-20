export type CoverRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function snapshotCoverRect(rect: DOMRect): CoverRect {
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

export function coverRectsMatch(first: CoverRect, second: CoverRect): boolean {
  return (Object.keys(first) as (keyof CoverRect)[]).every(
    (key) => Math.abs(first[key] - second[key]) < 0.5,
  );
}

// Both endpoints use the destination layout box. Only its compositor transform
// changes during flight; measuring or resizing the box per frame causes jumps.
export function getCoverTransform(source: CoverRect, destination: CoverRect): string {
  return `translate3d(${source.left - destination.left}px, ${source.top - destination.top}px, 0) scale(${source.width / destination.width}, ${source.height / destination.height})`;
}

export function getOffscreenReturnTransform(rect: CoverRect): string {
  const scale = 1.08;
  return `translate3d(${-rect.width * (scale - 1) / 2}px, ${-rect.height * (scale - 1) / 2}px, 0) scale(${scale}, ${scale})`;
}

export const settledCoverTransform = "translate3d(0px, 0px, 0) scale(1, 1)";

export function nextMotionFrame(signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve(false);
    const abort = () => {
      cancelAnimationFrame(frame);
      resolve(false);
    };
    const frame = requestAnimationFrame(() => {
      signal.removeEventListener("abort", abort);
      resolve(true);
    });
    signal.addEventListener("abort", abort, { once: true });
  });
}

// A poster is sufficient for a video cover. Waiting for video playback would
// couple navigation to autoplay policy and start another decoder during flight.
export function waitForCoverImages(
  container: Element,
  signal: AbortSignal,
): Promise<boolean> {
  const images = [...container.querySelectorAll("img")];
  return Promise.all(images.map((image) => new Promise<boolean>((resolve) => {
    if (signal.aborted) return resolve(false);
    let settled = false;
    const finish = (ready: boolean) => {
      if (settled) return;
      settled = true;
      image.removeEventListener("load", loaded);
      image.removeEventListener("error", failed);
      signal.removeEventListener("abort", aborted);
      resolve(ready);
    };
    const failed = () => finish(false);
    const aborted = () => finish(false);
    const loaded = () => {
      if (!image.naturalWidth) return finish(false);
      // Cached does not necessarily mean decoded, particularly in WebKit.
      Promise.resolve(image.decode?.()).then(
        () => finish(!signal.aborted),
        () => finish(!signal.aborted && image.complete && image.naturalWidth > 0),
      );
    };
    signal.addEventListener("abort", aborted, { once: true });
    image.addEventListener("load", loaded);
    image.addEventListener("error", failed);
    if (image.complete) loaded();
  }))).then((ready) => !signal.aborted && ready.every(Boolean));
}
