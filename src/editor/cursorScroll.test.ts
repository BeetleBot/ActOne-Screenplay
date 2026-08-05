import { pendingScrollTargetY, PENDING_SCROLL_VERTICAL_FACTOR } from "./cursorScroll";

describe("cursorScroll utilities", () => {
  describe("pendingScrollTargetY", () => {
    it("scrolls to position cursor at 30% from top of viewport", () => {
      const scrollTop = 100;
      const cursorClientY = 180;
      const containerRectTop = 50;
      const containerHeight = 200;
      const result = pendingScrollTargetY(scrollTop, cursorClientY, containerRectTop, containerHeight);
      const expected = scrollTop + (cursorClientY - containerRectTop) - containerHeight * PENDING_SCROLL_VERTICAL_FACTOR;
      expect(result).toBe(expected);
    });

    it("keeps scroll position when cursor is already at the 30% line", () => {
      const containerHeight = 200;
      const containerRectTop = 50;
      const scrollTop = 100;
      const cursorClientY = containerRectTop + containerHeight * PENDING_SCROLL_VERTICAL_FACTOR;
      const result = pendingScrollTargetY(scrollTop, cursorClientY, containerRectTop, containerHeight);
      expect(result).toBe(scrollTop);
    });

    it("uses the correct factor constant", () => {
      expect(PENDING_SCROLL_VERTICAL_FACTOR).toBe(0.3);
    });
  });
});