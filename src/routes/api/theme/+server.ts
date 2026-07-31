import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { theme } = await request.json();
  const value = theme === 'dark' ? 'dark' : 'light';
  cookies.set('theme', value, {
    path: '/',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365
  });
  return json({ theme: value });
};
