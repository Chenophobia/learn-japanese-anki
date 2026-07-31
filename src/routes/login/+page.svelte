<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  let { form } = $props();

  // Forward whatever query string (e.g. ?next=/stats) got this page loaded,
  // so a user bounced here who then clicks "Sign up" doesn't lose the
  // original destination — safeNextPath is applied where `next` is actually
  // honored (the signup and login form actions), not here.
  const signupHref = $derived(`/signup${page.url.search}`);
</script>

<div class="flex min-h-screen items-center justify-center bg-paper p-6">
  <form
    method="POST"
    use:enhance
    class="w-full max-w-sm space-y-4 rounded-2xl border border-hairline bg-surface p-6 shadow-sm sm:p-8"
  >
    <h1 class="text-2xl font-semibold text-ink">Sign in</h1>

    {#if form?.error}
      <p
        class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950 dark:text-red-300"
      >
        {form.error}
      </p>
    {/if}

    <label class="block space-y-1">
      <span class="text-sm font-medium text-ink-muted">Username</span>
      <input
        name="username"
        value={form?.username ?? ''}
        autocomplete="username"
        required
        class="w-full rounded-md border border-hairline bg-paper px-3 py-2 text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
      />
    </label>

    <label class="block space-y-1">
      <span class="text-sm font-medium text-ink-muted">Password</span>
      <input
        name="password"
        type="password"
        autocomplete="current-password"
        required
        class="w-full rounded-md border border-hairline bg-paper px-3 py-2 text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
      />
    </label>

    <label class="flex items-center gap-2 text-sm text-ink-muted">
      <input name="remember" type="checkbox" class="rounded accent-accent" />
      Keep me signed in on this device
    </label>

    <button
      class="w-full rounded-md bg-ink px-4 py-2 font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      Sign in
    </button>

    <p class="text-center text-sm text-ink-muted">
      No account?
      <a
        href={signupHref}
        class="rounded-sm font-medium text-accent underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >Sign up</a
      >
    </p>
  </form>
</div>
