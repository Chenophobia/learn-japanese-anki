<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';

  let { data, children } = $props();

  const links = [
    { href: '/', label: 'Map' },
    { href: '/study', label: 'Study' },
    { href: '/stats', label: 'Stats' }
  ];
</script>

{#if data.user}
  <header class="sticky top-0 z-10 border-b border-hairline bg-surface">
    <nav class="mx-auto flex w-full max-w-3xl items-center gap-1 p-3 sm:gap-2 sm:p-4" aria-label="Primary">
      {#each links as link}
        {@const isActive = page.url.pathname === link.href}
        <a
          href={link.href}
          aria-current={isActive ? 'page' : undefined}
          class="rounded-md border-b-2 px-2.5 py-2 text-sm transition-colors hover:bg-black/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:hover:bg-white/10 sm:px-3"
          class:border-accent={isActive}
          class:border-transparent={!isActive}
          class:text-ink={isActive}
          class:text-ink-muted={!isActive}
          class:font-semibold={isActive}
          class:font-medium={!isActive}
        >
          {link.label}
        </a>
      {/each}

      <div class="ml-auto flex items-center gap-1">
        <ThemeToggle theme={data.theme} />
        <form method="POST" action="/logout">
          <button
            class="rounded-md px-2.5 py-2 text-sm text-ink-muted transition-colors hover:bg-black/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:hover:bg-white/10 sm:px-3"
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
