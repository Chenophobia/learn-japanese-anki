<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { invalidateAll } from '$app/navigation';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { shouldRevalidate } from '$lib/revalidate';
  import { rating } from '$lib/study-state.svelte';

  let { data, children } = $props();

  const links = [
    { href: '/', label: 'Map' },
    { href: '/study', label: 'Study' },
    { href: '/stats', label: 'Stats' }
  ];

  // Tracks whether the tab has been hidden since the last revalidation.
  // visibilitychange fires on becoming visible regardless of whether it was
  // ever hidden, so without this every fire would trigger a refetch.
  let wasHidden = false;

  $effect(() => {
    function revalidate(restoredFromBfcache: boolean) {
      if (
        !shouldRevalidate({
          restoredFromBfcache,
          wasHidden,
          ratingInFlight: rating.inFlight,
          answerRevealed: rating.answerRevealed
        })
      ) {
        return;
      }
      wasHidden = false;
      void invalidateAll();
    }

    function onPageShow(event: PageTransitionEvent) {
      revalidate(event.persisted);
    }

    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        wasHidden = true;
        return;
      }
      revalidate(false);
    }

    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  });
</script>

{#if data.user}
  <header class="border-hairline bg-surface sticky top-0 z-10 border-b">
    <nav
      class="mx-auto flex w-full max-w-3xl items-center gap-1 p-2 sm:gap-2 sm:p-4"
      aria-label="Primary"
    >
      {#each links as link (link.href)}
        {@const isActive = page.url.pathname === link.href}
        <!--
          The active indicator is an absolutely positioned bar, not a
          `border-b-2`. A bottom border on a `rounded-md` box is painted along
          the rounded path, so its colour arcs up the left and right corners
          by the full border radius. Safari on iOS/iPadOS antialiases those
          arcs heavily, which reads as the highlight bleeding up the sides of
          the tab. A separate bar has no corners to follow.
        -->
        <a
          href={link.href}
          aria-current={isActive ? 'page' : undefined}
          class="hover:text-ink focus-visible:ring-accent relative rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:outline-none sm:px-3 dark:hover:bg-white/10 {isActive
            ? 'text-ink font-semibold'
            : 'text-ink-muted font-medium'}"
        >
          {link.label}
          {#if isActive}
            <span
              aria-hidden="true"
              class="bg-accent pointer-events-none absolute inset-x-1.5 bottom-0.5 h-0.5 rounded-full"
            ></span>
          {/if}
        </a>
      {/each}

      <div class="ml-auto flex items-center gap-1">
        <ThemeToggle theme={data.theme} />
        <form method="POST" action="/logout">
          <button
            class="text-ink-muted hover:text-ink focus-visible:ring-accent rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:outline-none sm:px-3 dark:hover:bg-white/10"
          >
            Sign out
          </button>
        </form>
      </div>
    </nav>
  </header>
{/if}

<main class="mx-auto w-full max-w-3xl p-4 sm:p-6">
  {@render children()}
</main>
