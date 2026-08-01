/**
 * Operator user-creation script.
 *
 * Signup is closed — this app is publicly reachable and open self-registration
 * invited bot accounts. The only way to add a user now is for the operator to
 * run this script against the same database the running app uses.
 *
 * Usage (env vars, so the password never lands in shell history the way an
 * argv-based invocation would):
 *
 *   CREATE_USER_USERNAME=someone CREATE_USER_PASSWORD='a-strong-password' \
 *     npm run create-user
 *
 * Inside the deployed container (see README.md "Creating users"):
 *
 *   docker exec -e CREATE_USER_USERNAME=someone -e CREATE_USER_PASSWORD='a-strong-password' \
 *     learn-japanese npm run create-user
 *
 * Username/password are validated with the exact same rules the old signup
 * form enforced (`validateCredentials`), so accounts created here can't bypass
 * constraints the login flow assumes (e.g. a username shape other code relies
 * on). Duplicate usernames are refused with a clear message and a non-zero
 * exit code, same as signup used to do.
 *
 * This imports the app's own `db` singleton (`src/lib/server/db`), so it
 * opens (and, if empty, seeds) the exact same `${DATA_DIR}/app.db` the
 * running app process has open — not a separate copy. Run it via `npm run
 * create-user`, which invokes it through `tsx`, so it runs directly off the
 * TypeScript source with no separate build step of its own.
 */
import { validateCredentials } from '../src/lib/server/auth/credentials';
import { hashPassword } from '../src/lib/server/auth/password';
import { usernameTaken, insertUser } from '../src/lib/server/auth/users';
import { db } from '../src/lib/server/db';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  const username = process.env.CREATE_USER_USERNAME;
  const password = process.env.CREATE_USER_PASSWORD;

  if (!username || !password) {
    fail(
      'Usage: CREATE_USER_USERNAME=<username> CREATE_USER_PASSWORD=<password> npm run create-user\n' +
        '(Both must be set via environment variables, not argv, so the password does not land in shell history.)'
    );
  }

  const problem = validateCredentials(username, password);
  if (problem) fail(`Refusing to create user: ${problem}`);

  // Common-path check first, same as signup used to do: gives a clean
  // message before doing any hashing work.
  if (usernameTaken(db, username)) {
    fail(`Refusing to create user: username "${username}" is already taken.`);
  }

  const user = insertUser(db, username, await hashPassword(password), new Date().toISOString());
  if (!user) {
    fail(`Refusing to create user: username "${username}" is already taken.`);
  }

  console.log(`Created user "${user.username}" (id ${user.id}).`);
  process.exit(0);
}

main();
