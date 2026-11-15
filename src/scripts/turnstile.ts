export interface TurnstileOptions {
  sitekey: string;
  theme: "light" | "dark";
  size: "compact";
  appearance: "interaction-only";
  retry: "never";
  "refresh-expired": "manual";
  "refresh-timeout": "manual";
  "response-field": false;
  "before-interactive-callback": () => void;
  "after-interactive-callback": () => void;
  callback: (token: string) => void;
  "error-callback": () => boolean;
  "expired-callback": () => void;
  "timeout-callback": () => void;
}
export interface Turnstile {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  remove: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
    onContactTurnstileLoad?: () => void;
  }
}

let loading: Promise<Turnstile> | undefined;
let scriptLoad: Promise<Turnstile> | undefined;
let ready: Turnstile | undefined;

/** Shared across Astro visits; no network request until the form is used. */
export function loadTurnstile(): Promise<Turnstile> {
  if (ready) return Promise.resolve(ready);
  if (loading) return loading;
  scriptLoad ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onContactTurnstileLoad";
    script.async = true;
    script.onerror = () => {
      script.remove();
      scriptLoad = undefined;
      reject(new Error("Verification could not load."));
    };
    // The provider callback supports async loading; turnstile.ready() does not.
    window.onContactTurnstileLoad = () => {
      const api = window.turnstile;
      if (!api) return;
      ready = api;
      resolve(api);
    };
    document.head.append(script);
  });
  // A UI deadline must not cancel/reinsert a script that can still execute.
  // Retry shares the in-flight load; a late callback caches the initialized API.
  let timer: ReturnType<typeof setTimeout>;
  loading = Promise.race([
    scriptLoad,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Verification could not load.")), 30_000);
    }),
  ]).finally(() => {
    clearTimeout(timer);
    loading = undefined;
  });
  return loading;
}
