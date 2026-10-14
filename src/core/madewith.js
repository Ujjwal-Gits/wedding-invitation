// The one line every invitation ends with: a quiet "Made with Nimtto" in the theme's own ink.
// Asset credits are never shown to guests; they live on /credits/ (linked from the showroom only).

const ORN = '<svg class="madewith__orn" viewBox="0 0 10 10" aria-hidden="true" focusable="false"><path d="M5 .6 6.2 3.8 9.4 5 6.2 6.2 5 9.4 3.8 6.2.6 5 3.8 3.8Z" fill="currentColor"/></svg>';

/** Markup for the footer line. Place it as the last child of the theme's closing footer. */
export function madeWith() {
  return `<p class="madewith"><a class="madewith__a" href="https://nimtto.com" target="_blank" rel="noopener">${ORN}<span class="l-en">Made with <b>Nimtto</b></span><span class="l-ne" lang="ne">निम्तोद्वारा बनाइएको</span>${ORN}</a></p>`;
}
