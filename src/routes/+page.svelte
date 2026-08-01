<script lang="ts">
  import ProgressBar from '$lib/components/ProgressBar.svelte';
  import RollingNumber from '$lib/components/RollingNumber.svelte';
  let { data } = $props();

  const TRACK_LABELS: Record<string, string> = {
    kana: 'Alphabet',
    kanji: 'Kanji',
    vocab: 'Vocabulary',
    grammar: 'Grammar'
  };

  const currentChapterId = $derived(
    data.chapters.find((c) => c.units.some((u) => u.status === 'current'))?.id
  );
  const courseComplete = $derived(
    data.chapters.length > 0 && data.chapters.every((c) => c.units.every((u) => u.status === 'done'))
  );

  function connector(active: boolean) {
    return active ? 'bg-accent' : 'bg-hairline';
  }
</script>

<svelte:head>
  <title>Course map</title>
</svelte:head>

<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <div class="min-w-0">
    <h1 class="text-2xl font-semibold text-ink">Course map</h1>
    <p class="mt-1 text-sm text-ink-muted">
      {#if courseComplete}
        Every unit is done — nice work.
      {:else}
        <RollingNumber value={data.counts.due} /> due now ·
        <RollingNumber value={data.counts.newAvailable} /> new available
      {/if}
    </p>
  </div>
  <a
    href="/study"
    class="inline-flex shrink-0 items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
  >
    Start studying
  </a>
</div>

<div class="space-y-3">
  {#each data.chapters as chapter, i (chapter.id)}
    {@const isCurrentChapter = chapter.id === currentChapterId}
    {@const isLastChapter = i === data.chapters.length - 1}
    {@const startsTrack = chapter.kind !== data.chapters[i - 1]?.kind}
    {#if startsTrack}
      <!--
        A track heading, drawn wherever `kind` differs from the previous
        chapter's. This relies on chapters being authored in track order, so
        each track is contiguous and gets exactly one heading; content.test.ts
        asserts that contiguity. `<h2>` here demotes the chapter titles below
        to `<h3>`, keeping the outline a real hierarchy rather than a flat run
        of same-level headings.
      -->
      <h2
        class="px-1 pt-5 pb-1 text-xs font-semibold tracking-widest text-ink-muted uppercase first:pt-0"
      >
        {TRACK_LABELS[chapter.kind] ?? chapter.kind}
      </h2>
    {/if}
    <details
      open={isCurrentChapter || (courseComplete && isLastChapter)}
      class="group overflow-hidden rounded-lg border bg-surface {isCurrentChapter
        ? 'border-accent/50'
        : 'border-hairline'}"
    >
      <summary
        class="flex cursor-pointer list-none items-center gap-3 p-4 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset sm:gap-4 [&::-webkit-details-marker]:hidden"
      >
        <span
          class="hidden shrink-0 text-3xl leading-none font-light tabular-nums text-ink-muted/30 sm:inline sm:text-4xl"
          aria-hidden="true"
        >
          {String(i + 1).padStart(2, '0')}
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline justify-between gap-3">
            <h3 class="truncate font-medium text-ink">{chapter.title}</h3>
            <span class="shrink-0 text-sm tabular-nums text-ink-muted">
              {chapter.introduced}<span class="opacity-60">/{chapter.total}</span>
            </span>
          </div>
          <div class="mt-2">
            <ProgressBar value={chapter.introduced} total={chapter.total} />
          </div>
        </div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          class="h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>

      <ul class="border-t border-hairline">
        {#each chapter.units as unit, j (unit.id)}
          {@const topActive = j > 0 && chapter.units[j - 1].status === 'done'}
          {@const bottomActive = unit.status === 'done'}
          <li
            aria-current={unit.status === 'current' ? 'step' : undefined}
            class="flex items-center gap-3 px-4 py-2.5 text-sm
              {unit.status === 'locked' ? 'text-ink-muted/70' : ''}
              {unit.status === 'done' ? 'text-ink-muted' : ''}
              {unit.status === 'current' ? 'bg-accent/5' : ''}"
          >
            <span class="relative flex w-5 shrink-0 items-center justify-center self-stretch">
              {#if j > 0}
                <span class="absolute top-0 left-1/2 h-1/2 w-px -translate-x-1/2 path-line {connector(topActive)}"
                ></span>
              {/if}
              {#if j < chapter.units.length - 1}
                <span
                  class="absolute bottom-0 left-1/2 h-1/2 w-px -translate-x-1/2 path-line {connector(bottomActive)}"
                ></span>
              {/if}
              {#if unit.status === 'done'}
                <span class="relative z-10 h-2.5 w-2.5 rounded-full bg-ink-muted/60"></span>
              {:else if unit.status === 'current'}
                <!-- The ring is drawn via the 'breathe' animation's box-shadow, not Tailwind classes.
                     The animation-fill-mode: both declaration preserves the 100% keyframe's 4px ring
                     even when prefers-reduced-motion: reduce collapses the animation to a single
                     near-zero-duration iteration. -->
                <span class="path-dot-current relative z-10 h-3 w-3 rounded-full bg-accent"></span>
              {:else}
                <span class="relative z-10 h-2 w-2 rounded-full border border-hairline bg-surface"></span>
              {/if}
            </span>

            <span class="hidden w-14 shrink-0 text-[11px] tracking-wide text-ink-muted/70 uppercase md:inline">
              {unit.kind}
            </span>

            <span class="min-w-0 flex-1 truncate {unit.status === 'current' ? 'font-semibold text-ink' : ''}">
              {unit.title}
            </span>

            {#if unit.status === 'current'}
              <span class="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                Current
              </span>
            {:else if unit.status === 'locked'}
              <span class="sr-only">Locked</span>
            {:else}
              <span class="sr-only">Done</span>
            {/if}

            <span class="shrink-0 tabular-nums text-ink-muted">{unit.introduced}/{unit.total}</span>
            <span class="hidden w-16 shrink-0 text-right tabular-nums text-ink-muted/70 sm:inline">
              {unit.mature} mature
            </span>
          </li>
        {/each}
      </ul>
    </details>
  {/each}
</div>
