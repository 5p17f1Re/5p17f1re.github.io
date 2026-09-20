import { afterEach, describe, expect, it, vi, type MockInstance } from "vitest";
import {
  coverRectsMatch,
  getCoverTransform,
  getOffscreenReturnTransform,
  nextMotionFrame,
  settledCoverTransform,
  waitForCoverImages,
  type CoverRect,
} from "../lib/case-cover-motion";

function deferred() {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

class FakeImage extends EventTarget {
  complete = false;
  naturalWidth = 0;
  decode = vi.fn(() => Promise.resolve());
}

function containerWith(...images: FakeImage[]): Element {
  return {
    querySelectorAll: (selector: string) => {
      expect(selector).toBe("img");
      return images;
    },
  } as unknown as Element;
}

function cachedImage() {
  const image = new FakeImage();
  image.complete = true;
  image.naturalWidth = 1200;
  return image;
}

function expectImageListenersRemoved(
  added: MockInstance<FakeImage["addEventListener"]>,
  removed: MockInstance<FakeImage["removeEventListener"]>,
) {
  for (const [event, listener] of added.mock.calls) {
    expect(removed).toHaveBeenCalledWith(event, listener);
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("cover image readiness", () => {
  it("waits for decode even when the image is already cached", async () => {
    const image = cachedImage();
    const decode = deferred();
    image.decode.mockReturnValue(decode.promise);
    const ready = vi.fn();
    const result = waitForCoverImages(containerWith(image), new AbortController().signal);
    void result.then(ready);

    await Promise.resolve();
    expect(image.decode).toHaveBeenCalledOnce();
    expect(ready).not.toHaveBeenCalled();

    decode.resolve();
    await expect(result).resolves.toBe(true);
  });

  it("waits for a cold image to load and then finish decoding", async () => {
    const image = new FakeImage();
    const decode = deferred();
    image.decode.mockReturnValue(decode.promise);
    const added = vi.spyOn(image, "addEventListener");
    const removed = vi.spyOn(image, "removeEventListener");
    const ready = vi.fn();
    const result = waitForCoverImages(containerWith(image), new AbortController().signal);
    void result.then(ready);

    expect(image.decode).not.toHaveBeenCalled();
    image.complete = true;
    image.naturalWidth = 800;
    image.dispatchEvent(new Event("load"));
    await Promise.resolve();
    expect(image.decode).toHaveBeenCalledOnce();
    expect(ready).not.toHaveBeenCalled();

    decode.resolve();
    await expect(result).resolves.toBe(true);
    expectImageListenersRemoved(added, removed);
  });

  it("does not hand off while another cover image is still decoding", async () => {
    const first = cachedImage();
    const second = cachedImage();
    const decode = deferred();
    second.decode.mockReturnValue(decode.promise);
    const ready = vi.fn();
    const result = waitForCoverImages(containerWith(first, second), new AbortController().signal);
    void result.then(ready);
    await Promise.resolve();
    expect(ready).not.toHaveBeenCalled();

    decode.resolve();
    await expect(result).resolves.toBe(true);
  });

  it("settles on a load error and removes its listeners", async () => {
    const image = new FakeImage();
    const added = vi.spyOn(image, "addEventListener");
    const removed = vi.spyOn(image, "removeEventListener");
    const result = waitForCoverImages(containerWith(image), new AbortController().signal);
    image.dispatchEvent(new Event("error"));

    await expect(result).resolves.toBe(false);
    expect(image.decode).not.toHaveBeenCalled();
    expectImageListenersRemoved(added, removed);
  });

  it("recognizes a previously failed cached image without awaiting another load", async () => {
    const image = new FakeImage();
    image.complete = true;

    await expect(waitForCoverImages(containerWith(image), new AbortController().signal))
      .resolves.toBe(false);
    expect(image.decode).not.toHaveBeenCalled();
  });

  it("accepts a renderable image when decode rejects", async () => {
    const image = cachedImage();
    image.decode.mockRejectedValue(new Error("Decode unavailable"));

    await expect(waitForCoverImages(containerWith(image), new AbortController().signal))
      .resolves.toBe(true);
  });

  it("aborts an unloaded image, removes listeners and ignores a later load", async () => {
    const image = new FakeImage();
    const controller = new AbortController();
    const added = vi.spyOn(image, "addEventListener");
    const removed = vi.spyOn(image, "removeEventListener");
    const signalRemoved = vi.spyOn(controller.signal, "removeEventListener");
    const result = waitForCoverImages(containerWith(image), controller.signal);
    controller.abort();

    await expect(result).resolves.toBe(false);
    expectImageListenersRemoved(added, removed);
    expect(signalRemoved).toHaveBeenCalledWith("abort", expect.any(Function));
    image.complete = true;
    image.naturalWidth = 1200;
    image.dispatchEvent(new Event("load"));
    expect(image.decode).not.toHaveBeenCalled();
  });

  it("settles an abort even if decode hangs and cannot later become ready", async () => {
    const image = cachedImage();
    const controller = new AbortController();
    const decode = deferred();
    image.decode.mockReturnValue(decode.promise);
    const added = vi.spyOn(image, "addEventListener");
    const removed = vi.spyOn(image, "removeEventListener");
    const ready = vi.fn();
    const result = waitForCoverImages(containerWith(image), controller.signal);
    void result.then(ready);
    controller.abort();

    await expect(result).resolves.toBe(false);
    expectImageListenersRemoved(added, removed);
    decode.resolve();
    await Promise.resolve();
    expect(ready).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("does no image work for a transition that was already aborted", async () => {
    const image = cachedImage();
    const controller = new AbortController();
    controller.abort();
    const added = vi.spyOn(image, "addEventListener");

    await expect(waitForCoverImages(containerWith(image), controller.signal))
      .resolves.toBe(false);
    expect(added).not.toHaveBeenCalled();
    expect(image.decode).not.toHaveBeenCalled();
  });
});

describe("motion frame cancellation", () => {
  it("cancels a queued frame and settles the aborted wait", async () => {
    const request = vi.fn(() => 27);
    const cancel = vi.fn();
    vi.stubGlobal("requestAnimationFrame", request);
    vi.stubGlobal("cancelAnimationFrame", cancel);
    const controller = new AbortController();
    const result = nextMotionFrame(controller.signal);
    controller.abort();

    await expect(result).resolves.toBe(false);
    expect(cancel).toHaveBeenCalledWith(27);
  });

  it("does not queue a frame when already aborted", async () => {
    const request = vi.fn();
    vi.stubGlobal("requestAnimationFrame", request);
    const controller = new AbortController();
    controller.abort();

    await expect(nextMotionFrame(controller.signal)).resolves.toBe(false);
    expect(request).not.toHaveBeenCalled();
  });

  it("cleans up cancellation after a frame has completed", async () => {
    let runFrame!: FrameRequestCallback;
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      runFrame = callback;
      return 27;
    }));
    const cancel = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancel);
    const controller = new AbortController();
    const removed = vi.spyOn(controller.signal, "removeEventListener");
    const result = nextMotionFrame(controller.signal);
    runFrame(16);

    await expect(result).resolves.toBe(true);
    expect(removed).toHaveBeenCalledWith("abort", expect.any(Function));
    controller.abort();
    expect(cancel).not.toHaveBeenCalled();
  });
});

function transformedRect(rect: CoverRect, transform: string): CoverRect {
  const match = transform.match(/^translate3d\((.+)px, (.+)px, 0\) scale\((.+), (.+)\)$/);
  if (!match) throw new Error(`Unsupported cover transform: ${transform}`);
  return {
    left: rect.left + Number(match[1]),
    top: rect.top + Number(match[2]),
    width: rect.width * Number(match[3]),
    height: rect.height * Number(match[4]),
  };
}

describe("persistent cover geometry", () => {
  it.each([
    { left: 20, top: 180, width: 165, height: 120 },
    { left: 205, top: 180, width: 165, height: 240 },
    { left: 40, top: -80, width: 310, height: 175 },
  ])("maps the destination box onto the original source without resizing it: %j", (source) => {
    const destination = { left: 20, top: 280, width: 350, height: 220 };
    const actual = transformedRect(destination, getCoverTransform(source, destination));
    for (const key of Object.keys(source) as (keyof CoverRect)[]) {
      expect(actual[key]).toBeCloseTo(source[key]);
    }
    expect(transformedRect(destination, settledCoverTransform)).toEqual(destination);
  });

  it("keeps the offscreen return centered over the restored homepage card", () => {
    const destination = { left: 205, top: 120, width: 165, height: 100 };
    const initial = transformedRect(destination, getOffscreenReturnTransform(destination));

    expect(initial.width).toBeGreaterThan(destination.width);
    expect(initial.left + initial.width / 2)
      .toBeCloseTo(destination.left + destination.width / 2);
    expect(initial.top + initial.height / 2)
      .toBeCloseTo(destination.top + destination.height / 2);
  });

  it("tolerates subpixel noise but rejects a visibly changing destination", () => {
    const first = { left: 20, top: 120, width: 350, height: 220 };

    expect(coverRectsMatch(first, { ...first, top: 120.2, width: 350.4 })).toBe(true);
    expect(coverRectsMatch(first, { ...first, top: 121 })).toBe(false);
    expect(coverRectsMatch(first, { ...first, width: 351 })).toBe(false);
  });
});
