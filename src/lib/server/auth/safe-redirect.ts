/**
 * Restricts a user-controlled `next` redirect target to a same-origin path.
 *
 * Rejects anything that is not an absolute path (no scheme, no host), including
 * protocol-relative URLs (`//evil.com`) and backslash-leading variants
 * (`/\evil.com`) that some browsers normalize into protocol-relative URLs.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return '/';
  if (!next.startsWith('/')) return '/';
  if (next.startsWith('//') || next.startsWith('/\\')) return '/';
  return next;
}
