<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import type { SubmitFunction } from '@sveltejs/kit';
  import Card from '$lib/components/Card.svelte';

  let { data, form } = $props();

  let revealed = $state(false);
  let submitting = $state(false);
  let rateButtons: HTMLButtonElement[] = $state([]);

  // A new card object means a new question — hide the answer again. This
  // must be keyed off the card id (not just "did data change") so that
  // re-running load with the *same* card (e.g. after a rejected/mismatched
  // rating) doesn't leave a stale reveal, and so a genuinely new card never
  // arrives pre-revealed.
  $effect(() => {
    void data.item?.cardId;
    revealed = false;
  });

  const RATING_BG: Record<number, string> = {
    1: 'bg-again',
    2: 'bg-hard',
    3: 'bg-good',
    4: 'bg-accent'
  };

  // Guards double submission: `disabled` on the buttons stops a second
  // pointer/keyboard event once the first has fired, and `cancel()` here is
  // a second line of defense in case a submit slips through (e.g. Enter and
  // a click landing in the same tick) before Svelte re-renders the disabled
  // state.
  const handleRate: SubmitFunction = ({ cancel }) => {
    if (submitting) {
      cancel();
      return;
    }
    submitting = true;
    return async ({ update, result }) => {
      // use:enhance's built-in `update()` only calls invalidateAll() when
      // result.type === 'success' — never on a fail() response. A mismatch
      // (stale/racing cardId) always comes back as a failure, so without an
      // explicit invalidateAll() here, load never reruns and the page keeps
      // showing the stale card behind the error banner instead of syncing to
      // whatever the server actually has next.
      await update();
      if (result.type !== 'success') {
        await invalidateAll();
      }
      submitting = false;
    };
  };

  function onKeydown(e: KeyboardEvent) {
    if (!data.item || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const target = e.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

    if (e.key === ' ') {
      // A focused button/link already responds to space itself — don't
      // double-handle it.
      if (target && ['BUTTON', 'A'].includes(target.tagName)) return;
      if (!revealed) {
        e.preventDefault();
        revealed = true;
      }
      return;
    }

    if (revealed && !submitting && /^[1-4]$/.test(e.key)) {
      e.preventDefault();
      rateButtons[Number(e.key) - 1]?.click();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<svelte:head>
  <title>Study</title>
</svelte:head>

{#if data.item}
  <p class="mb-3 flex items-baseline justify-between gap-3 text-sm text-ink-muted">
    <span class="flex min-w-0 items-baseline gap-1.5">
      <span class="truncate">{data.item.unitTitle}</span>
      {#if data.item.isNew}
        <span class="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">New</span>
      {/if}
    </span>
    <span class="shrink-0 tabular-nums">{data.counts.due} due · {data.counts.newAvailable} new</span>
  </p>

  {#if form?.error}
    <p
      class="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950 dark:text-red-300"
    >
      {form.error}
    </p>
  {/if}

  <Card kind={data.item.unitKind} front={data.item.front} back={data.item.back} {revealed} />

  <!-- Anchored low so the primary action stays in a phone's thumb zone even
       when the card content is short; -mx/px cancels the page gutter so the
       bar reaches the viewport edges. -->
  <div
    class="sticky bottom-0 -mx-4 mt-6 border-t border-hairline bg-paper px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6"
  >
    {#if revealed}
      <form method="POST" action="?/rate" use:enhance={handleRate} class="grid grid-cols-4 gap-2">
        <input type="hidden" name="cardId" value={data.item.cardId} />
        {#each data.item.previews as preview, i (preview.rating)}
          <button
            bind:this={rateButtons[i]}
            name="rating"
            value={preview.rating}
            disabled={submitting}
            class="flex flex-col items-center gap-0.5 rounded-lg py-3 font-semibold text-paper transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-60 {RATING_BG[
              preview.rating
            ]}"
          >
            <span class="text-sm sm:text-base">{preview.label}</span>
            <span class="text-xs font-normal opacity-90 sm:text-sm">{preview.interval}</span>
          </button>
        {/each}
      </form>
    {:else}
      <button
        onclick={() => (revealed = true)}
        class="w-full rounded-lg bg-ink py-3.5 text-base font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        Show answer
        <span class="ml-1.5 hidden text-sm opacity-70 sm:inline">(space)</span>
      </button>
    {/if}
  </div>
{:else}
  <div class="flex flex-col items-center gap-3 rounded-2xl border border-hairline bg-surface p-10 text-center">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      class="h-10 w-10 text-good"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </svg>
    {#if data.curriculumFinished}
      <p class="text-xl font-semibold text-ink">Every card, learned</p>
      <p class="max-w-sm text-sm text-ink-muted">
        You've worked through the whole curriculum. Reviews will keep resurfacing on schedule — check back as they
        come due.
      </p>
    {:else}
      <p class="text-xl font-semibold text-ink">Done for now</p>
      <p class="max-w-sm text-sm text-ink-muted">
        Nothing's due and today's new cards are finished. Come back tomorrow for more.
      </p>
    {/if}
    <a
      href="/"
      class="mt-2 rounded-sm text-sm font-medium text-accent underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      Back to the map
    </a>
  </div>
{/if}
