<script lang="ts">
  import { enhance } from '$app/forms';
  let { form } = $props();
</script>

<div class="bg-paper flex min-h-screen items-center justify-center p-6">
  <form
    method="POST"
    use:enhance
    class="border-hairline bg-surface w-full max-w-sm space-y-4 rounded-2xl border p-6 shadow-sm sm:p-8"
  >
    <h1 class="text-ink text-2xl font-semibold">Sign in</h1>

    {#if form?.error}
      <p
        class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950 dark:text-red-300"
      >
        {form.error}
      </p>
    {/if}

    <label class="block space-y-1">
      <span class="text-ink-muted text-sm font-medium">Username</span>
      <input
        name="username"
        value={form?.username ?? ''}
        autocomplete="username"
        required
        class="border-hairline bg-paper text-ink placeholder:text-ink-muted focus:border-accent focus:ring-accent w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
      />
    </label>

    <label class="block space-y-1">
      <span class="text-ink-muted text-sm font-medium">Password</span>
      <input
        name="password"
        type="password"
        autocomplete="current-password"
        required
        class="border-hairline bg-paper text-ink placeholder:text-ink-muted focus:border-accent focus:ring-accent w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
      />
    </label>

    <label class="text-ink-muted flex items-center gap-2 text-sm">
      <input name="remember" type="checkbox" class="accent-accent rounded" />
      Keep me signed in on this device
    </label>

    <button
      class="bg-ink text-paper focus-visible:ring-accent focus-visible:ring-offset-surface w-full rounded-md px-4 py-2 font-medium transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      Sign in
    </button>
  </form>
</div>
