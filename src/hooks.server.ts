import { redirect, type Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { SESSION_COOKIE, validateSession } from '$lib/server/auth/session';

const PUBLIC_ROUTES = ['/login'];

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get(SESSION_COOKIE);
  event.locals.user = sessionId ? await validateSession(db, sessionId) : null;
  if (sessionId && !event.locals.user) {
    event.cookies.delete(SESSION_COOKIE, { path: '/' });
  }

  event.locals.theme = event.cookies.get('theme') === 'dark' ? 'dark' : 'light';

  const isPublic = PUBLIC_ROUTES.includes(event.url.pathname);
  if (!event.locals.user && !isPublic) {
    // Preserve the full path, including any query string (e.g. /stats?range=30),
    // not just the pathname — otherwise a guard redirect drops context the
    // target page needs once the user signs in and is sent back to it.
    const target = `${event.url.pathname}${event.url.search}`;
    throw redirect(303, `/login?next=${encodeURIComponent(target)}`);
  }
  if (event.locals.user && isPublic) {
    throw redirect(303, '/');
  }

  const dark = event.locals.theme === 'dark';
  return resolve(event, {
    transformPageChunk: ({ html }) =>
      html
        .replace('%theme%', dark ? 'dark' : '')
        // --color-paper for the active theme, so the status bar in a
        // homescreen launch matches the page rather than the OS setting.
        .replace('%themecolor%', dark ? '#14171c' : '#f6f7f8')
  });
};
