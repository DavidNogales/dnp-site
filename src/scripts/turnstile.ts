export interface TurnstileOptions {
  sitekey: string;
  theme: "light" | "dark";
  size: "compact";
  appearance: "interaction-only";
  retry: "never";
  "refresh-expired": "manual";
  "refresh-timeout": "manual";
  "response-field": false;
  callback: (token: string) => void;
  "error-callback": () => boolean;
  "expired-callback": () => void;
  "timeout-callback": () => void;
}
export interface Turnstile {
  ready: (callback: () => void) => void;
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  remove: (id: string) => void;
}
declare global { interface Window { turnstile?: Turnstile; } }

let loading: Promise<Turnstile> | undefined;
let ready: Turnstile | undefined;

/** Shared across Astro visits; no network request until the form is used. */
export function loadTurnstile(): Promise<Turnstile> {
  if (ready) return Promise.resolve(ready);
  if (loading) return loading;
  loading = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script.remove();
      reject(new Error("Verification could not load."));
    };
    const timer = setTimeout(fail, 30_000);
    script.onerror = fail;
    script.onload = () => {
      if (settled) return;
      const api = window.turnstile;
      if (!api) return fail();
      api.ready(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        ready = api;
        resolve(api);
      });
    };
    document.head.append(script);
  }).catch(error => {
    loading = undefined;
    throw error;
  });
  return loading;
}
