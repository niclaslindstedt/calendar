// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// How each piece of a day is set, per view: the two scopes, the variables they
// publish, and what a settings blob written before the answers were per-view
// carries into them.
import { describe, expect, it } from "vitest";

import { calFontStack } from "../src/app/fonts.ts";
import { DEFAULT_TEXT_SCALE, TEXT_STEP_SCALE } from "../src/app/textSize.ts";
import {
  DEFAULT_LOOK,
  DEFAULT_SETTINGS,
  LOOK_KEYS,
  migrateStyles,
  pickLook,
  updateLook,
} from "../src/app/useAppSettings.ts";
import {
  DEFAULT_CAL_STYLES,
  SCALED_PIECES,
  SCOPE_CLASS,
  SCOPE_OF_VIEW,
  STYLED_PIECES,
  STYLE_SCOPES,
  STYLE_VIEWS,
  facesOf,
  fontVar,
  resolveCalStyles,
  setPieceStyle,
  sizeVar,
  styleVars,
  stylesSignature,
} from "../src/app/viewStyle.ts";

describe("the scopes", () => {
  it("gives the month its own answers and lets the two strip views share", () => {
    // The week planner and the day list print the same row from the same code,
    // so a setting that moved in one and not the other would be a bug.
    expect(STYLE_VIEWS).toEqual(["month", "week", "list"]);
    expect(SCOPE_OF_VIEW.month).toBe("month");
    expect(SCOPE_OF_VIEW.week).toBe("strip");
    expect(SCOPE_OF_VIEW.list).toBe("strip");
  });

  it("names a class per scope, and two different ones", () => {
    const classes = STYLE_SCOPES.map((scope) => SCOPE_CLASS[scope]);
    expect(new Set(classes).size).toBe(STYLE_SCOPES.length);
  });

  it("ships every almanac piece at the measured size, in both views", () => {
    for (const scope of STYLE_SCOPES) {
      for (const piece of SCALED_PIECES) {
        expect(DEFAULT_CAL_STYLES[scope][piece].size).toBe(DEFAULT_TEXT_SCALE);
      }
      expect(DEFAULT_CAL_STYLES[scope].entry.size).toBe("dynamic");
    }
  });

  it("keeps the printed defaults each view already had", () => {
    // The date in the display serif everywhere; the week number in the strip's
    // almanac italic but plain in the month grid's gutter, which is what the
    // two looked like before the face was settable.
    expect(DEFAULT_CAL_STYLES.month.day.font).toBe("print");
    expect(DEFAULT_CAL_STYLES.strip.day.font).toBe("print");
    expect(DEFAULT_CAL_STYLES.strip.week.font).toBe("print");
    expect(DEFAULT_CAL_STYLES.month.week.font).toBe("mono");
  });
});

describe("the published variables", () => {
  it("writes a face and a size for every piece of every scope", () => {
    const vars = styleVars(DEFAULT_CAL_STYLES);
    for (const scope of STYLE_SCOPES) {
      for (const piece of STYLED_PIECES) {
        expect(vars[fontVar(scope, piece)]).toBe(
          calFontStack(DEFAULT_CAL_STYLES[scope][piece].font),
        );
      }
      for (const piece of SCALED_PIECES) {
        expect(vars[sizeVar(scope, piece)]).toBe(String(DEFAULT_TEXT_SCALE));
      }
    }
  });

  it("leaves no piece unmapped — a gap would inherit the other view's answer", () => {
    // The dialog's samples sit inside the app shell, so a variable a scope
    // did not publish would fall through to whatever was set outside it.
    const vars = styleVars(DEFAULT_CAL_STYLES);
    const expected =
      STYLE_SCOPES.length * (STYLED_PIECES.length + SCALED_PIECES.length + 2);
    expect(Object.keys(vars)).toHaveLength(expected);
    expect(new Set(Object.keys(vars)).size).toBe(expected);
  });

  it("scales a caption band from the face that scope has it set in", () => {
    const styles = setPieceStyle(DEFAULT_CAL_STYLES, "month", "nameDays", {
      font: "dyslexic",
    });
    const vars = styleVars(styles);
    expect(vars["--cal-month-nameday-scale"]).toBe("0.78");
    // The strip is a different page and keeps its own answer.
    expect(vars["--cal-strip-nameday-scale"]).toBe("1");
  });

  it("lists the faces in use so they can be fetched", () => {
    expect(facesOf(DEFAULT_CAL_STYLES).sort()).toEqual(["mono", "print"]);
    expect(
      facesOf(
        setPieceStyle(DEFAULT_CAL_STYLES, "strip", "entry", {
          font: "dyslexic",
        }),
      ),
    ).toContain("dyslexic");
  });
});

describe("stylesSignature", () => {
  it("changes when a setting does, and not otherwise", () => {
    const same = resolveCalStyles(DEFAULT_CAL_STYLES);
    expect(stylesSignature(same)).toBe(stylesSignature(DEFAULT_CAL_STYLES));
    const moved = setPieceStyle(DEFAULT_CAL_STYLES, "strip", "day", {
      size: TEXT_STEP_SCALE.large,
    });
    expect(stylesSignature(moved)).not.toBe(
      stylesSignature(DEFAULT_CAL_STYLES),
    );
  });
});

describe("setPieceStyle", () => {
  it("moves one piece of one scope and leaves the rest alone", () => {
    const next = setPieceStyle(DEFAULT_CAL_STYLES, "month", "holidays", {
      font: "serif",
    });
    expect(next.month.holidays.font).toBe("serif");
    expect(next.month.holidays.size).toBe(DEFAULT_TEXT_SCALE);
    expect(next.month.nameDays).toEqual(DEFAULT_CAL_STYLES.month.nameDays);
    expect(next.strip).toBe(DEFAULT_CAL_STYLES.strip);
  });
});

describe("resolveCalStyles", () => {
  it("holds a hand-edited blob to the ladders", () => {
    const styles = resolveCalStyles({
      month: { day: { font: "comic", size: 9 }, entry: { size: "huge" } },
    });
    expect(styles.month.day.font).toBe(DEFAULT_CAL_STYLES.month.day.font);
    expect(styles.month.day.size).toBe(TEXT_STEP_SCALE.large);
    expect(styles.month.entry.size).toBe("dynamic");
  });

  it("fills a scope the blob says nothing about", () => {
    expect(resolveCalStyles({ month: {} }).strip).toEqual(
      DEFAULT_CAL_STYLES.strip,
    );
    expect(resolveCalStyles(null)).toEqual(DEFAULT_CAL_STYLES);
  });
});

describe("carrying an older settings blob forward", () => {
  it("hands the one old answer to both views", () => {
    // A reader who had the day's names on Large meant both views; splitting
    // the setting must not quietly reset half of it.
    const styles = migrateStyles({
      sizeNameDays: TEXT_STEP_SCALE.large,
      fontNameDays: "serif",
      textSize: "medium",
      fontEntry: "sans",
    });
    for (const scope of STYLE_SCOPES) {
      expect(styles[scope].nameDays).toEqual({
        font: "serif",
        size: TEXT_STEP_SCALE.large,
      });
      expect(styles[scope].entry).toEqual({ font: "sans", size: "medium" });
    }
  });

  it("leaves the week number on each scope's own default — it had no face", () => {
    const styles = migrateStyles({ sizeWeek: TEXT_STEP_SCALE.small });
    expect(styles.month.week).toEqual({
      font: "mono",
      size: TEXT_STEP_SCALE.small,
    });
    expect(styles.strip.week).toEqual({
      font: "print",
      size: TEXT_STEP_SCALE.small,
    });
  });

  it("prefers the per-view answer once there is one", () => {
    const styles = migrateStyles({
      sizeDay: TEXT_STEP_SCALE.small,
      styles: { month: { day: { size: TEXT_STEP_SCALE.large } } },
    });
    expect(styles.month.day.size).toBe(TEXT_STEP_SCALE.large);
    // …and still carries the old one where the new object is silent.
    expect(styles.strip.day.size).toBe(TEXT_STEP_SCALE.small);
  });

  it("is a no-op on a blob that never had the old keys", () => {
    expect(migrateStyles(DEFAULT_SETTINGS)).toEqual(DEFAULT_CAL_STYLES);
  });
});

describe("the previewed look", () => {
  it("carries the styles, so Cancel drops them", () => {
    expect(LOOK_KEYS).toContain("styles");
    expect(pickLook(DEFAULT_SETTINGS).styles).toBe(DEFAULT_SETTINGS.styles);
  });

  it("previews a size rather than saving it straight away", () => {
    const bigger = updateLook(
      DEFAULT_LOOK,
      "styles",
      setPieceStyle(DEFAULT_LOOK.styles, "strip", "nameDays", {
        size: TEXT_STEP_SCALE.large,
      }),
    );
    expect(bigger.styles.strip.nameDays.size).toBe(TEXT_STEP_SCALE.large);
    // The month grid is a different page and is left where it was.
    expect(bigger.styles.month.nameDays.size).toBe(DEFAULT_TEXT_SCALE);
  });
});
