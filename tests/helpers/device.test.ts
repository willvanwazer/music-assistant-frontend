import { deviceInset, insetCorner, watchInsetCorner } from "@/helpers/device";
import { afterEach, describe, expect, it } from "vitest";

// Each side carries its own value, so reaching for the wrong one reads as the
// wrong number instead of quietly passing.
const INSET_LEFT = "77px";
const INSET_RIGHT = "44px";

describe("deviceInset", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("style");
    document.body.innerHTML = "";
  });

  it("reports the room each side of the screen reserves", () => {
    document.documentElement.style.setProperty(
      "--device-inset-left",
      INSET_LEFT,
    );
    document.documentElement.style.setProperty(
      "--device-inset-right",
      INSET_RIGHT,
    );

    expect(deviceInset("left")).toBe(parseFloat(INSET_LEFT));
    expect(deviceInset("right")).toBe(parseFloat(INSET_RIGHT));
  });

  it("reports no room where the screen reserves none", () => {
    expect(deviceInset("left")).toBe(0);
    expect(deviceInset("right")).toBe(0);
  });

  // It is read once per popout that opens, so anything it leaves behind piles
  // up for as long as the app is on screen.
  it("leaves nothing behind to measure against", () => {
    deviceInset("left");
    deviceInset("right");

    expect(document.body.children).toHaveLength(0);
  });
});

describe("insetCorner", () => {
  const NONE = { top: 0, right: 0, bottom: 0, left: 0 };

  // an iPhone Duo opened out on its side, with the clock and camera together in
  // one top corner, which iOS reports along the whole top and that whole side
  it.each([
    ["top-right", { ...NONE, top: 90, right: 80, bottom: 20 }],
    ["top-left", { ...NONE, top: 90, left: 80, bottom: 20 }],
  ])("names the %s corner an iPhone draws into", (corner, insets) => {
    expect(insetCorner(insets, true)).toBe(corner);
  });

  it.each([
    [
      "upright, with the island along the top",
      { ...NONE, top: 62, bottom: 34 },
    ],
    [
      "on its side, with the island on one side",
      { ...NONE, right: 62, left: 62, bottom: 21 },
    ],
    ["with nothing reserved", NONE],
  ])("leaves an ordinary iPhone %s alone", (_, insets) => {
    expect(insetCorner(insets, true)).toBeNull();
  });

  // an Android phone drawn edge to edge pairs a full-width status bar with a
  // cutout or the navigation bar down one side, which really do cover it all
  it("leaves the same insets alone off iOS", () => {
    expect(insetCorner({ ...NONE, top: 24, left: 48 }, false)).toBeNull();
  });
});

describe("watchInsetCorner", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("style");
    delete document.documentElement.dataset.insetCorner;
  });

  // the test browser is no iPhone, so a top and a side inset together are
  // taken as the whole strips they describe
  it("does not mark a corner off iOS", () => {
    document.documentElement.style.setProperty("--device-inset-top", "90px");
    document.documentElement.style.setProperty("--device-inset-right", "80px");

    watchInsetCorner();

    expect(document.documentElement.dataset.insetCorner).toBeUndefined();
    expect(document.body.children).toHaveLength(0);
  });
});
