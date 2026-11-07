import MobileDetect from "mobile-detect";

export type DeviceType = "desktop" | "phone" | "tablet";

const md = new MobileDetect(window.navigator.userAgent);

// All resolved once from the user agent, so they never change while the app runs.
// The flags say nothing about the viewport and overlap: a phone or tablet is also
// mobile, while mobile on its own means the device could not be sized as either.
export const IS_TABLET_UA = Boolean(md.tablet());
export const IS_PHONE_UA = Boolean(md.phone());
export const IS_MOBILE_UA = Boolean(md.mobile());
// iPadOS Safari presents itself as a Mac, so this is an iPhone (or iPod)
const IS_IOS_UA = md.os() === "iOS";

export const DEVICE_TYPE: DeviceType = IS_TABLET_UA
  ? "tablet"
  : IS_PHONE_UA || IS_MOBILE_UA
    ? "phone"
    : "desktop";

/**
 * How far in from a side of the screen it is safe to draw, in pixels.
 *
 * The layout viewport spans the cutout and the rounded corners, so anything
 * measured from `window.innerWidth` has to take this off to clear them.
 */
export function deviceInset(side: InsetSide) {
  // read off a padding rather than the custom property itself: WebKit reports 0
  // for a custom property holding env(), while a length it lays a box out with
  // carries the inset the page is actually drawn against
  const probe = document.createElement("div");
  probe.style.cssText = `position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;padding-left:var(--device-inset-${side})`;
  document.body.appendChild(probe);
  const inset = parseFloat(getComputedStyle(probe).paddingLeft) || 0;
  probe.remove();
  return inset;
}

export type InsetSide = "top" | "right" | "bottom" | "left";
export type InsetCorner = "top-left" | "top-right";

/**
 * The top corner the system draws into, when that is all it covers.
 *
 * An iPhone Duo opened out on its side keeps the clock and the camera together
 * in one top corner. iOS can only report that as an inset along the whole top
 * and the whole of that side, which would leave a strip down the side and a
 * band across the top empty for the sake of the corner. No other iPhone pairs
 * the two: upright the inset is along the top, on its side along the sides
 * (with the home indicator along the bottom). Other systems can (an Android
 * phone drawn edge to edge pairs a full-width status bar with a camera cutout
 * or navigation bar on the side), so it is read on iOS only.
 */
export function insetCorner(
  insets: Record<InsetSide, number>,
  isIOS: boolean = IS_IOS_UA,
): InsetCorner | null {
  if (!isIOS || insets.top <= 0) return null;
  if (insets.right > 0 && insets.left <= 0) return "top-right";
  if (insets.left > 0 && insets.right <= 0) return "top-left";
  return null;
}

/**
 * Keep `data-inset-corner` on the root element naming the corner the system
 * draws into, if that is all it covers, so the layout can give back the rest
 * of the strips the side and top insets reserve.
 */
export function watchInsetCorner() {
  const root = document.documentElement;
  const update = () => {
    const corner = insetCorner({
      top: deviceInset("top"),
      right: deviceInset("right"),
      bottom: deviceInset("bottom"),
      left: deviceInset("left"),
    });
    if (corner) root.dataset.insetCorner = corner;
    else delete root.dataset.insetCorner;
  };
  update();
  // iOS can settle the insets of a turned screen after the resize that
  // announces it, so the turn is read again once it has finished
  let settle: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener("resize", () => {
    update();
    clearTimeout(settle);
    settle = setTimeout(update, 300);
  });
}

export function isTouchscreenDevice() {
  // detect if device/browser is touch enabled
  let result = false;
  if (window.PointerEvent && "maxTouchPoints" in navigator) {
    if (navigator.maxTouchPoints > 0) {
      result = true;
    }
  } else {
    if (
      window.matchMedia &&
      window.matchMedia("(any-pointer:coarse)").matches
    ) {
      result = true;
    } else if (window.TouchEvent || "ontouchstart" in window) {
      result = true;
    }
  }
  return result;
}
