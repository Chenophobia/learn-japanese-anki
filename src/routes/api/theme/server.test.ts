import { describe, it, expect } from 'vitest';
import { POST } from './+server';

type SetCall = { name: string; value: string; opts: { maxAge?: number; httpOnly?: boolean } };

function makeEvent(body: unknown) {
  const setCalls: SetCall[] = [];
  const event = {
    request: new Request('http://localhost/api/theme', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' }
    }),
    cookies: {
      set: (name: string, value: string, opts: SetCall['opts']) => {
        setCalls.push({ name, value, opts });
      }
    }
  };
  return { event: event as unknown as Parameters<typeof POST>[0], setCalls };
}

describe('POST /api/theme', () => {
  it('persists dark in a year-long, JS-readable cookie', async () => {
    const { event, setCalls } = makeEvent({ theme: 'dark' });
    const res = await POST(event);
    expect(await res.json()).toEqual({ theme: 'dark' });
    expect(setCalls).toHaveLength(1);
    expect(setCalls[0]).toMatchObject({
      name: 'theme',
      value: 'dark',
      opts: { httpOnly: false, maxAge: 60 * 60 * 24 * 365 }
    });
  });

  it('coerces anything that is not dark to light', async () => {
    const { event, setCalls } = makeEvent({ theme: 'neon-pink' });
    const res = await POST(event);
    expect(await res.json()).toEqual({ theme: 'light' });
    expect(setCalls[0].value).toBe('light');
  });

  it('treats a missing theme field as light', async () => {
    const { event, setCalls } = makeEvent({});
    const res = await POST(event);
    expect(await res.json()).toEqual({ theme: 'light' });
    expect(setCalls[0].value).toBe('light');
  });
});
