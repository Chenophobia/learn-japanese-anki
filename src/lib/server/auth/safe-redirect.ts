// C0 controls (0x00–0x1F) and DEL (0x7F). Browsers strip ASCII tab/LF/CR from
// a URL wherever they occur before parsing it (WHATWG URL spec), so a value
// like "/\t/evil.com" looks like a harmless same-origin path here but is
// resolved by the browser as "//evil.com" — an off-site, protocol-relative
// redirect. A value that needs a control character stripped to look safe is
// not a value to honor, so any such value is rejected outright rather than
// sanitized.
// eslint-disable-next-line no-control-regex -- matching control characters is this pattern's entire job
const CONTROL_CHAR_PATTERN = /[\x00-\x1F\x7F]/;

/**
 * Restricts a user-controlled `next` redirect target to a same-origin path.
 *
 * Rejects anything that is not an absolute path (no scheme, no host), including
 * protocol-relative URLs (`//evil.com`), backslash-leading variants
 * (`/\evil.com`) that some browsers normalize into protocol-relative URLs,
 * and values containing C0 control characters (tab, CR, LF, etc.) that
 * browsers strip during URL parsing and that can be used to smuggle a
 * protocol-relative URL past the structural checks below.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return '/';
  if (CONTROL_CHAR_PATTERN.test(next)) return '/';
  if (!next.startsWith('/')) return '/';
  if (next.startsWith('//') || next.startsWith('/\\')) return '/';
  return next;
}
