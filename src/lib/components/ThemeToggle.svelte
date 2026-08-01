<script lang="ts">
  let { theme }: { theme: 'light' | 'dark' } = $props();

  // `current` derives from the `theme` prop rather than snapshotting it, so
  // a change to the prop (e.g. the cookie being set by something other than
  // this toggle) is picked up instead of silently ignored. `override` holds
  // the optimistic value between a click and the next time the prop itself
  // actually changes; the effect below clears it whenever that happens, so
  // a real prop update always wins over a stale optimistic click.
  let override: 'light' | 'dark' | null = $state(null);
  const current = $derived(override ?? theme);

  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- bare read registers `theme` as this effect's dependency
    theme;
    override = null;
  });

  async function toggle() {
    const next = current === 'dark' ? 'light' : 'dark';
    override = next;
    document.documentElement.classList.toggle('dark', next === 'dark');
    await fetch('/api/theme', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ theme: next })
    });
  }
</script>

<button
  type="button"
  onclick={toggle}
  aria-label={current === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
  title={current === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
  class="text-ink-muted hover:text-ink focus-visible:ring-accent relative grid h-9 w-9 shrink-0 place-items-center rounded-md transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:outline-none dark:hover:bg-white/10"
>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="absolute h-5 w-5 transition-all duration-200"
    class:scale-0={current === 'dark'}
    class:opacity-0={current === 'dark'}
    class:rotate-90={current === 'dark'}
  >
    <circle cx="12" cy="12" r="4" />
    <path
      d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
    />
  </svg>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="absolute h-5 w-5 transition-all duration-200"
    class:scale-0={current === 'light'}
    class:opacity-0={current === 'light'}
    class:-rotate-90={current === 'light'}
  >
    <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
  </svg>
</button>
