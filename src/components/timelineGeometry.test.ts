import { describe, expect, it } from "vitest";
import { timelineLineAtX, timelinePercentAtLine, timelineSpan } from "./timelineGeometry";

describe("timeline coordinate system", () => {
  it.each([320, 800, 1440])("keeps 302 uneven scenes aligned at %i pixels, including scene 127", (width) => {
    const lengths = Array.from({ length: 302 }, (_, i) => 1 + ((i * 17) % 83));
    const total = lengths.reduce((sum, n) => sum + n, 0);
    let start = 0;
    for (const length of lengths) {
      const span = timelineSpan(start, start + length, total);
      const left = (parseFloat(span.left) / 100) * width;
      const size = (parseFloat(span.width) / 100) * width;
      expect(timelineLineAtX(73 + left + size / 2, { left: 73, width }, total)).toBeGreaterThanOrEqual(start);
      expect(timelineLineAtX(73 + left + size / 2, { left: 73, width }, total)).toBeLessThan(start + length);
      expect(parseFloat(span.left)).toBeCloseTo(timelinePercentAtLine(start, total), 12);
      start += length;
    }
    expect(start).toBe(total);
  });

  it("maps the full track rectangle when zoomed and horizontally scrolled", () => {
    const total = 12000;
    expect(timelineLineAtX(400, { left: -800, width: 2400 }, total)).toBe(6000);
    expect(timelineLineAtX(-900, { left: -800, width: 2400 }, total)).toBe(0);
    expect(timelineLineAtX(1800, { left: -800, width: 2400 }, total)).toBe(total - 1);
  });

  it("ignores unmeasurable tracks and invalid pointer coordinates", () => {
    expect(timelineLineAtX(40, { left: 0, width: 0 }, 100)).toBeNull();
    expect(timelineLineAtX(Number.NaN, { left: 0, width: 100 }, 100)).toBeNull();
    expect(timelineLineAtX(40, { left: 0, width: 100 }, 0)).toBeNull();
  });
});
