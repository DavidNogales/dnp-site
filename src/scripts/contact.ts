import { loadTurnstile, type Turnstile } from "./turnstile";

let current: { form: HTMLFormElement; dispose: () => void } | undefined;
const uncertain = "Could not confirm delivery. Your message may already have arrived. Check before sending again.";
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object";

export function disposeContact() {
  current?.dispose();
  current = undefined;
}

export function initializeContact() {
  const element = document.querySelector<HTMLFormElement>("[data-contact]");
  if (element && current?.form === element) return;
  disposeContact();
  if (!element || !element.dataset.sitekey) return;
  const form = element;
  const fieldset = form.querySelector<HTMLFieldSetElement>("fieldset")!;
  const send = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const retry = form.querySelector<HTMLButtonElement>("[data-retry]")!;
  const status = form.querySelector<HTMLElement>("[data-status]")!;
  const statusText = status.querySelector<HTMLElement>("[data-status-text]")!;
  const region = form.querySelector<HTMLElement>("[data-verification]")!;
  const container = form.querySelector<HTMLElement>("[data-turnstile]")!;
  const listeners = new AbortController();
  let active = true;
  let api: Turnstile | undefined;
  let widget: string | undefined;
  let generation = 0;
  let starting = false;
  let attempted = false;
  let pending = false;
  let sending = false;
  let token = "";
  let tokenTime = 0;
  let expiry: ReturnType<typeof setTimeout> | undefined;
  let request: AbortController | undefined;
  const theme = (): "dark" | "light" => document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  let renderedTheme = theme();
  const alive = () => active && form.isConnected;
  const announce = (message: string, state: "idle" | "pending" | "success" | "error" = "idle") => {
    statusText.textContent = message;
    status.dataset.state = state;
  };
  const controls = () => {
    fieldset.disabled = sending;
    send.disabled = sending || pending;
    // Keep the live status outside the busy subtree so progress is announced.
    fieldset.setAttribute("aria-busy", String(sending || pending));
  };
  const clearWidget = () => {
    generation++;
    starting = false;
    token = "";
    clearTimeout(expiry);
    if (widget !== undefined) api?.remove(widget);
    widget = undefined;
    container.replaceChildren();
    region.hidden = true;
  };
  const verificationFailed = (message: string) => {
    clearWidget();
    pending = false;
    retry.hidden = false;
    controls();
    announce(message, "error");
  };
  const clearErrors = () => {
    form.querySelectorAll("[aria-invalid]").forEach(el => el.removeAttribute("aria-invalid"));
    form.querySelectorAll("[data-field-error]").forEach(el => { el.textContent = ""; });
  };

  async function verify() {
    if (!alive() || starting || widget !== undefined || sending) return;
    attempted = true;
    starting = true;
    retry.hidden = true;
    announce("Verifying… Complete the verification if prompted.", "pending");
    const ownGeneration = ++generation;
    const valid = () => alive() && ownGeneration === generation;
    try {
      api = await loadTurnstile();
      if (!valid()) return;
      renderedTheme = theme();
      widget = api.render(container, {
        sitekey: form.dataset.sitekey!, theme: renderedTheme, size: "compact",
        appearance: "interaction-only", retry: "never", "refresh-expired": "manual",
        "refresh-timeout": "manual", "response-field": false,
        "before-interactive-callback"() {
          if (valid() && !sending && !token) region.hidden = false;
        },
        "after-interactive-callback"() {
          if (valid()) region.hidden = true;
        },
        callback(value) {
          if (!valid() || sending || token || !value) return;
          token = value;
          region.hidden = true;
          tokenTime = Date.now();
          expiry = setTimeout(() => {
            if (valid() && !sending) verificationFailed("Verification expired. Retry verification before sending.");
          }, 300_000);
          announce("Verification complete. Ready to send.", "success");
          if (pending) void submit();
        },
        "error-callback"() {
          if (valid() && !sending) verificationFailed("Verification failed. Check your connection or blocker settings, then retry verification.");
          return true; // Error already presented accessibly; never log user data.
        },
        "expired-callback"() {
          if (valid() && !sending) verificationFailed("Verification expired. Retry verification before sending.");
        },
        "timeout-callback"() {
          if (valid() && !sending) verificationFailed("Verification timed out. Retry verification when ready.");
        },
      });
      starting = false;
    } catch {
      if (valid()) verificationFailed("Verification could not load. Check your connection or blocker settings, then retry verification.");
    }
  }

  async function submit() {
    if (!alive() || sending) return;
    if (!form.reportValidity()) { pending = false; controls(); return; }
    if (token && Date.now() - tokenTime >= 300_000) clearWidget();
    pending = true;
    controls();
    if (!token) { await verify(); return; }
    const data = new FormData(form);
    data.set("cf-turnstile-response", token);
    clearWidget(); // Token is consumed by this attempt; late callbacks cannot reuse it.
    region.hidden = true;
    pending = false;
    sending = true;
    retry.hidden = true;
    clearErrors();
    controls();
    announce("Sending…", "pending");
    request = new AbortController();
    const controller = request;
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(form.action, {
        method: "POST", body: data, headers: { Accept: "application/json" }, signal: controller.signal,
      });
      const result: unknown = await response.json().catch(() => null);
      if (!alive() || controller.signal.aborted) {
        if (alive()) announce(uncertain, "error");
        return;
      }
      // Formspree's current SDK recognizes "next"; do not follow that URL.
      // Also accept its explicit ok flag, but never let errors claim success.
      const hasErrors = record(result) && (typeof result.error === "string" || Array.isArray(result.errors));
      const accepted = record(result) && !hasErrors && result.ok !== false
        && (typeof result.next === "string" || result.ok === true);
      if (response.ok && accepted) {
        form.reset();
        announce("Message sent. Thank you.", "success");
      } else if (response.ok && !hasErrors) {
        announce(uncertain, "error");
      } else {
        const messages: string[] = [];
        if (record(result)) {
          if (typeof result.error === "string") messages.push(result.error);
          if (Array.isArray(result.errors)) for (const error of result.errors) {
            if (!record(error) || typeof error.message !== "string") continue;
            messages.push(error.message);
            if (typeof error.field === "string" && ["email", "subject", "message"].includes(error.field)) {
              form.querySelector(`[name="${error.field}"]`)?.setAttribute("aria-invalid", "true");
              const hint = form.querySelector(`[data-field-error="${error.field}"]`);
              if (hint) hint.textContent = error.message;
            }
          }
        }
        announce(`Message could not be sent (HTTP ${response.status}). ${messages.join(" ") || "Please try again later."}`, "error");
      }
    } catch {
      if (alive()) announce(uncertain, "error");
    } finally {
      clearTimeout(timer);
      request = undefined;
      sending = false;
      if (alive()) controls();
    }
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!sending && !pending) void submit();
  }, { signal: listeners.signal });
  form.addEventListener("focusin", () => { if (!attempted) void verify(); }, { signal: listeners.signal });
  form.addEventListener("input", event => {
    const field = event.target;
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
      field.removeAttribute("aria-invalid");
      const hint = form.querySelector(`[data-field-error="${field.name}"]`);
      if (hint) hint.textContent = "";
    }
    if (!attempted) void verify();
  }, { signal: listeners.signal });
  retry.addEventListener("click", () => { pending = false; clearWidget(); void verify(); controls(); }, { signal: listeners.signal });
  const observer = new MutationObserver(() => {
    if (!attempted || sending || theme() === renderedTheme) return;
    pending = false;
    clearWidget();
    controls();
    void verify();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  current = { form, dispose() {
    active = false;
    pending = false;
    listeners.abort();
    observer.disconnect();
    request?.abort();
    clearWidget();
    fieldset.disabled = true;
  } };
  announce("Your message stays on this page while verification and sending complete.");
  fieldset.disabled = false;
}
