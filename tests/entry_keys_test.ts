// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { entryEditorAction } from "../src/app/entryKeys.ts";

describe("entryEditorAction", () => {
  it("writes a line break on an unmodified Enter", () => {
    expect(entryEditorAction({ key: "Enter" })).toBe("newline");
    expect(entryEditorAction({ key: "Enter", ctrlKey: false })).toBe("newline");
    expect(entryEditorAction({ key: "Enter", metaKey: false })).toBe("newline");
  });

  it("closes on a modified Enter", () => {
    expect(entryEditorAction({ key: "Enter", ctrlKey: true })).toBe("close");
    expect(entryEditorAction({ key: "Enter", metaKey: true })).toBe("close");
  });

  it("closes on Escape, modified or not", () => {
    expect(entryEditorAction({ key: "Escape" })).toBe("close");
    expect(entryEditorAction({ key: "Escape", metaKey: true })).toBe("close");
  });

  it("leaves every other key to the textarea", () => {
    for (const key of ["a", "Tab", "Backspace", "ArrowUp", " "]) {
      expect(entryEditorAction({ key })).toBeNull();
    }
  });
});
