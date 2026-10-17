import { afterEach, describe, expect, it, vi } from "vitest";
import { revealVirtualRow } from "./revealVirtualRow";

afterEach(() => vi.unstubAllGlobals());

describe("measured row reveal", () => {
  it("keeps observing after the first visible frame until row measurements settle", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const element = document.createElement("div");
    const row = document.createElement("div");
    element.getBoundingClientRect = () => ({ top: 0, bottom: 100 }) as DOMRect;
    let top = 10;
    row.getBoundingClientRect = () => ({ top, bottom: top + 40 }) as DOMRect;
    const cancel = revealVirtualRow(
      () => ({ element, scrollToRow: vi.fn() }),
      400,
      () => row,
    );
    frames.shift()!(0);
    top = 200;
    frames.shift()!(0);
    expect(element.scrollTop).toBeGreaterThan(0);
    cancel();
  });

  it("retries when height measurements move the target outside the viewport", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const element = document.createElement("div");
    const row = document.createElement("div");
    element.getBoundingClientRect = () => ({ top: 0, bottom: 100 }) as DOMRect;
    let visible = false;
    row.getBoundingClientRect = () => ({ top: visible ? 10 : 200, bottom: visible ? 50 : 240 }) as DOMRect;
    const scrollToRow = vi.fn();
    const cancel = revealVirtualRow(
      () => ({ element, scrollToRow }),
      400,
      () => (visible ? row : null),
    );
    frames.shift()!(0);
    expect(scrollToRow).toHaveBeenCalledTimes(2);
    visible = true;
    for (let index = 0; index < 5; index++) frames.shift()!(0);
    expect(frames).toHaveLength(0);
    cancel();
  });

  it("stops automatic reveal when the user scrolls manually", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const element = document.createElement("div");
    element.getBoundingClientRect = () => ({ top: 0, bottom: 100 }) as DOMRect;
    const scrollToRow = vi.fn();
    const cancel = revealVirtualRow(
      () => ({ element, scrollToRow }),
      400,
      () => null,
    );
    element.dispatchEvent(new WheelEvent("wheel"));
    frames.shift()!(0);
    expect(scrollToRow).toHaveBeenCalledTimes(1);
    cancel();
  });
});
