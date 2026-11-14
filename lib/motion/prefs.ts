/**
 * Motion preferences: "plain mode" (user toggle, persisted) and the OS
 * "reduce motion" setting. Motion (and later all 3D) runs only when neither is on.
 *
 * State is mirrored on <html> as classes so CSS can react before React hydrates:
 *   .plain  – plain mode is on
 *   .motion – animations are allowed
 */
export const PLAIN_MODE_KEY = "plain-mode";
/** set once the "turn the motion on" tip has been shown (or acted on) */
export const MOTION_TIP_KEY = "motion-tip-seen";
export const MOTION_PREF_EVENT = "motionprefchange";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

export function computeMotionEnabled(state: {
  plain: boolean;
  reduced: boolean;
}): boolean {
  return !state.plain && !state.reduced;
}

/**
 * Phones: a touch screen whose shorter side is under 768 px (a narrow desktop
 * window is not a phone). Phones start with motion and 3D off, because that
 * is the lightest experience; the visitor can turn it on.
 */
export function isPhone(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return (
    window.matchMedia("(pointer: coarse)").matches &&
    Math.min(window.screen.width, window.screen.height) < 768
  );
}

// remembered for this page when storage is unavailable (private mode)
let sessionChoice: boolean | null = null;

/** What the visitor chose: true = plain, false = motion on, null = never chose. */
export function readStoredPlain(): boolean | null {
  if (sessionChoice !== null) return sessionChoice;
  try {
    const v = window.localStorage.getItem(PLAIN_MODE_KEY);
    return v === "1" ? true : v === "0" ? false : null;
  } catch {
    return null;
  }
}

/** Plain mode: the visitor's choice, otherwise on for phones and off elsewhere. */
export function readPlainMode(): boolean {
  return readStoredPlain() ?? isPhone();
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
  sessionChoice = null;
  try {
    window.localStorage.setItem(PLAIN_MODE_KEY, on ? "1" : "0");
  } catch {
    /* storage unavailable: the choice lasts for this page only */
    sessionChoice = on;
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
export const MOTION_INIT_SCRIPT = `(function(){try{var d=document.documentElement;var s=null;try{s=localStorage.getItem(${JSON.stringify(
  PLAIN_MODE_KEY,
)})}catch(e){}var ph=false;try{ph=matchMedia("(pointer: coarse)").matches&&Math.min(screen.width,screen.height)<768}catch(e){}var p=s==="1"||(s!=="0"&&ph);var r=window.matchMedia&&matchMedia(${JSON.stringify(
  REDUCED_QUERY,
)}).matches;if(p)d.classList.add("plain");if(!p&&!r)d.classList.add("motion");setTimeout(function(){if(!window.__motionReady)d.classList.remove("motion")},5000)}catch(e){}})();`;
