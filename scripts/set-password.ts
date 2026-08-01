/**
 * Operator password-reset script.
 *
 * There is no self-service password reset in the app, so this is the only way
 * to change a password without deleting the account (which would also delete
 * that user's whole review history via the foreign keys).
 *
 * Usage (env vars, so the password never lands in shell history the way an
 * argv-based invocation would):
 *
 *   SET_PASSWORD_USERNAME=someone SET_PASSWORD_PASSWORD='a-strong-password' \
 *     npm run set-password
 *
 * Against the deployed container, stop the app first so exactly one process
 * ever touches app.db (see README.md "Creating users"):
 *
 *   docker compose stop
 *   docker compose run --rm \
 *     -e SET_PASSWORD_USERNAME=someone -e SET_PASSWORD_PASSWORD='a-strong-password' \
 *     app npm run set-password
 *   docker compose start
 *
 * The new password must satisfy the same rules the login flow assumes
 * (`validateCredentials`). An unknown username is refused with a non-zero exit
 * code rather than silently doing nothing.
 */
import { validateCredentials } from '../src/lib/server/auth/credentials';
import { hashPassword } from '../src/lib/server/auth/password';
import { setPasswordHash } from '../src/lib/server/auth/users';
import { db } from '../src/lib/server/db';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  const username = process.env.SET_PASSWORD_USERNAME;
  const password = process.env.SET_PASSWORD_PASSWORD;

  if (!username || !password) {
    fail(
      'Usage: SET_PASSWORD_USERNAME=<username> SET_PASSWORD_PASSWORD=<password> npm run set-password\n' +
        '(Both must be set via environment variables, not argv, so the password does not land in shell history.)'
    );
  }

  const problem = validateCredentials(username, password);
  if (problem) fail(`Refusing to set password: ${problem}`);

  const changed = setPasswordHash(db, username, await hashPassword(password));
  if (!changed) {
    fail(`Refusing to set password: no user named "${username}" exists.`);
  }

  console.log(`Password updated for "${username}".`);
  process.exit(0);
}

main();
