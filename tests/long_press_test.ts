// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// A day's press-and-hold opens the day as a page (`DayZoom`), and the same
// day's tap opens it for typing. The three views wire both onto one element —
// the framework's `useLongPress` spread first, the cell's own `onClick` after
// it — so the hold must end without a click reaching that `onClick`, or the
// editor opens behind the page. Before oss-framework 3.12.0 a hold longer
// than about 0.9 s let that click through; this pins the fix to the wiring
// the calendar actually uses.
import { h, render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLongPress } from "@niclaslindstedt/oss-framework/hooks";

function Day({
  onZoom,
  onEdit,
  editing = false,
}: {
  onZoom: () => void;
  onEdit: () => void;
  editing?: boolean;
}) {
  const press = useLongPress(onZoom, { enabled: !editing });
  return h("div", {
    role: "button",
    "aria-label": "2026-09-28",
    ...press,
    onClick: onEdit,
  });
}

function pointer(el: Element, type: string) {
  // jsdom has no PointerEvent; a MouseEvent carries every field the hook reads
  // (button, clientX/Y), and Preact dispatches by event name.
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    clientX: 10,
    clientY: 10,
  });
  el.dispatchEvent(event);
}

describe("a day's long press", () => {
  let root: HTMLElement;
  beforeEach(() => {
    vi.useFakeTimers();
    root = document.createElement("div");
    document.body.appendChild(root);
  });
  afterEach(() => {
    render(null, root);
    root.remove();
    vi.useRealTimers();
  });

  function mount(props: { editing?: boolean } = {}) {
    const onZoom = vi.fn();
    const onEdit = vi.fn();
    act(() => {
      render(h(Day, { onZoom, onEdit, ...props }), root);
    });
    const el = root.querySelector('[role="button"]')!;
    return { el, onZoom, onEdit };
  }

  // The press fires at 0.5 s. 0.6 s is a hold the old hook already handled;
  // 1.5 s and 3 s are past the 0.9 s where it used to let the click through.
  for (const heldMs of [600, 1500, 3000]) {
    it(`held ${heldMs} ms zooms the day and never opens the editor`, () => {
      const { el, onZoom, onEdit } = mount();
      pointer(el, "pointerdown");
      act(() => {
        vi.advanceTimersByTime(heldMs);
      });
      expect(onZoom).toHaveBeenCalledTimes(1);
      pointer(el, "pointerup");
      (el as HTMLElement).click();
      expect(onEdit).not.toHaveBeenCalled();
    });
  }

  it("lets the next tap through once the hold is over", () => {
    const { el, onEdit } = mount();
    pointer(el, "pointerdown");
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    pointer(el, "pointerup");
    (el as HTMLElement).click();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    pointer(el, "pointerdown");
    pointer(el, "pointerup");
    (el as HTMLElement).click();
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("a short tap opens the editor and does not zoom", () => {
    const { el, onZoom, onEdit } = mount();
    pointer(el, "pointerdown");
    act(() => {
      vi.advanceTimersByTime(100);
    });
    pointer(el, "pointerup");
    (el as HTMLElement).click();
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onZoom).not.toHaveBeenCalled();
  });

  it("does nothing while the day is being written in", () => {
    const { el, onZoom } = mount({ editing: true });
    pointer(el, "pointerdown");
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onZoom).not.toHaveBeenCalled();
  });
});
