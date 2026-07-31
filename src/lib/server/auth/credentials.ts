const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;

export function validateCredentials(username: string, password: string): string | null {
  if (!USERNAME_PATTERN.test(username)) {
    return 'Username must be 3–32 characters, letters, numbers, hyphen or underscore only.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  return null;
}
