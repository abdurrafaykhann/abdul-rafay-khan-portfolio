/**
 * Motion preferences: "plain mode" (user toggle, persisted) and the OS
 * "reduce motion" setting. Motion (and later all 3D) runs only when neither is on.
 *
 * State is mirrored on <html> as classes so CSS can react before React hydrates:
 *   .plain  – plain mode is on
 *   .motion – animations are allowed
 */
export const PLAIN_MODE_KEY = "plain-mode";
export const MOTION_PREF_EVENT = "motionprefchange";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

export function computeMotionEnabled(state: {
  plain: boolean;
  reduced: boolean;
}): boolean {
  return !state.plain && !state.reduced;
}

export function readPlainMode(): boolean {
  try {
    return window.localStorage.getItem(PLAIN_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export function readReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia(REDUCED_QUERY).matches
  );
}

export function readMotionEnabled(): boolean {
  return computeMotionEnabled({
    plain: readPlainMode(),
    reduced: readReducedMotion(),
  });
}

export function applyToDocument(): void {
  const root = document.documentElement;
  root.classList.toggle("plain", readPlainMode());
  root.classList.toggle("motion", readMotionEnabled());
}

export function setPlainMode(on: boolean): void {
  try {
    window.localStorage.setItem(PLAIN_MODE_KEY, on ? "1" : "0");
  } catch {
    /* storage unavailable: the choice lasts for this page only */
    document.documentElement.classList.toggle("plain", on);
  }
  applyToDocument();
  window.dispatchEvent(new Event(MOTION_PREF_EVENT));
}

export function subscribeMotionPrefs(onChange: () => void): () => void {
  const handle = () => {
    applyToDocument();
    onChange();
  };
  const mq =
    typeof window.matchMedia === "function"
      ? window.matchMedia(REDUCED_QUERY)
      : null;
  window.addEventListener(MOTION_PREF_EVENT, onChange);
  window.addEventListener("storage", handle);
  mq?.addEventListener("change", handle);
  return () => {
    window.removeEventListener(MOTION_PREF_EVENT, onChange);
    window.removeEventListener("storage", handle);
    mq?.removeEventListener("change", handle);
  };
}

/**
 * Runs in <head> before first paint so there is no flash:
 * sets the html classes, and — as a failsafe — if the app has not hydrated
 * after 5 s, drops `.motion` so content hidden for entrance animations shows.
 */
export const MOTION_INIT_SCRIPT = `(function(){try{var d=document.documentElement;var p=false;try{p=localStorage.getItem(${JSON.stringify(
  PLAIN_MODE_KEY,
)})==="1"}catch(e){}var r=window.matchMedia&&matchMedia(${JSON.stringify(
  REDUCED_QUERY,
)}).matches;if(p)d.classList.add("plain");if(!p&&!r)d.classList.add("motion");setTimeout(function(){if(!window.__motionReady)d.classList.remove("motion")},5000)}catch(e){}})();`;
