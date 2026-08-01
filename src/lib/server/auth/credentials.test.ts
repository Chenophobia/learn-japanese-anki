import { describe, it, expect } from 'vitest';
import { validateCredentials } from './credentials';

describe('validateCredentials', () => {
  it('accepts a reasonable username and password', () => {
    expect(validateCredentials('yao', 'hunter2hunter2')).toBeNull();
  });

  it('rejects a username shorter than 3 characters', () => {
    expect(validateCredentials('ab', 'hunter2hunter2')).toMatch(/username/i);
  });

  it('rejects a username with spaces or symbols', () => {
    expect(validateCredentials('yao chen', 'hunter2hunter2')).toMatch(/username/i);
    expect(validateCredentials('yao/chen', 'hunter2hunter2')).toMatch(/username/i);
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(validateCredentials('yao', 'short')).toMatch(/password/i);
  });

  it('rejects a username longer than 32 characters', () => {
    expect(validateCredentials('y'.repeat(33), 'hunter2hunter2')).toMatch(/username/i);
  });
});
