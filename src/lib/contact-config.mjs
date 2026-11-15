/** Resolve public build inputs only; the Turnstile secret belongs in Formspree. */
export function resolveContactConfig(formId, siteKey) {
  if (typeof formId !== "string" || typeof siteKey !== "string") return null;
  formId = formId.trim();
  siteKey = siteKey.trim();
  if (!/^[a-zA-Z0-9_-]{3,100}$/.test(formId) || !/^[a-zA-Z0-9_-]{20,100}$/.test(siteKey)) return null;
  return { endpoint: `https://formspree.io/f/${formId}`, siteKey };
}
