<script lang="ts">
  import { enhance } from '$app/forms';
  let { form } = $props();
</script>

<div class="flex min-h-screen items-center justify-center p-6">
  <form method="POST" use:enhance class="w-full max-w-sm space-y-4">
    <h1 class="text-2xl font-semibold">Sign in</h1>

    {#if form?.error}
      <p class="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{form.error}</p>
    {/if}

    <label class="block space-y-1">
      <span class="text-sm font-medium">Username</span>
      <input name="username" value={form?.username ?? ''} autocomplete="username" required
        class="w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />
    </label>

    <label class="block space-y-1">
      <span class="text-sm font-medium">Password</span>
      <input name="password" type="password" autocomplete="current-password" required
        class="w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />
    </label>

    <label class="flex items-center gap-2 text-sm">
      <input name="remember" type="checkbox" class="rounded" />
      Keep me signed in on this device
    </label>

    <button class="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white dark:bg-slate-100 dark:text-slate-900">
      Sign in
    </button>

    <p class="text-center text-sm text-slate-500">No account? <a href="/signup" class="underline">Sign up</a></p>
  </form>
</div>
